# Agent Build Instructions

> Stack: pnpm workspace + Turborepo. Node >= 22, pnpm >= 10 (`corepack enable`).
> Packages: `apps/mobile` (Expo SDK 56), `services/api` (Express), `packages/shared`, `packages/config`.

## Project Setup
```bash
pnpm install
```

## Running Tests
```bash
pnpm test          # vitest across the workspace (turbo)
```

## Build Commands
```bash
pnpm build         # turbo build (respects dep graph; shared builds first)
pnpm typecheck     # tsc --noEmit (strict) across all packages
pnpm lint          # eslint across all packages
```

## Development Server
```bash
pnpm dev           # api (tsx watch) + mobile (expo start) — persistent tasks
# single package: pnpm --filter @caraoke/api dev
```

## Key Learnings
- Monorepo orchestrated by Turborepo; `build`/`typecheck`/`test` set `dependsOn: ["^build"]`
  so `@caraoke/shared` compiles before consumers. CI gate = lint + typecheck + test.
- `@caraoke/shared` is the source-of-truth for cross-package types/Zod schemas (error
  envelope `{data,error}`, session state machine, domain events). Never redefine these.
- Mobile package is intentionally NOT `type: module` (Expo `babel.config.js` is CommonJS);
  its ESLint config is `eslint.config.mjs`. Mobile `build`/`typecheck` = `tsc --noEmit`
  (the shippable artifact is produced by EAS, not tsc).
- Expo SDK 56 = RN 0.85.3 / React 19.2.3. `newArchEnabled` is NOT a valid `app.config.ts`
  key in SDK 56 (new arch is default).
- Update this section when you learn new build optimizations or gotchas.

## Infrastructure (Terraform)
- `infra/modules/*` are reusable; `infra/envs/dev` is the composition root (`prod` is a
  placeholder). Region is Canada-only (NFR10) via a `region` variable validation + a
  `check "data_residency"` block; all data stores are KMS-encrypted at rest (NFR6).
- Validate/plan: `cd infra/envs/dev && terraform init && terraform validate && terraform plan`.
  Apply needs AWS creds whose default region is Canadian. State backend (S3) is commented in
  `backend.tf` so local state works for first validation.
- Aurora master password is RDS-managed in Secrets Manager (`manage_master_user_password`),
  not stored in TF. Secret *values* (spotify/xai/stripe) are populated out-of-band, never
  committed. The ECS API service is a placeholder (`desired_count = 0`, `busybox` image) until
  the real image ships; it `ignore_changes` on task_definition/desired_count so deploys don't
  fight Terraform.
- `modules/livekit` is the self-hosted SFU (Story 1.5): Fargate behind an NLB (TCP signaling
  7880/7881 + UDP media 7882), config via `LIVEKIT_CONFIG_BODY`, keys via the KMS-encrypted
  `<prefix>/livekit` secret, distributed state on the existing Redis over TLS. Media is
  SRTP/DTLS by construction (NFR6). Set the keys secret out-of-band before the service starts.
- The API reaches the SFU ONLY via the media integration abstraction
  (`services/api/src/integrations/media`, live|mock by `CARAOKE_INTEGRATIONS`). `GET
  /health/livekit` reports SFU reachability (200 healthy / 503 unhealthy, uniform envelope).
  Set `LIVEKIT_URL` for the live adapter.
- `services/spotify-mcp` is the Spotify MCP server (Story 1.6): streamable-http transport
  (`POST /mcp`, stateless) exposing playback-control tools (play/pause/resume/state). Spotify
  behind an integration abstraction (live Web-API + sandbox mock, `CARAOKE_INTEGRATIONS`).
  App credentials load from Secrets Manager (`SPOTIFY_SECRET_ID`) — never hard-coded; mock
  mode needs no AWS. NFR21: control-plane only, never proxies/re-streams audio. Deployed via
  the generalized `ecs-express` module (`service_name="spotify-mcp"`, secret-read task role).

## Mobile design system (Story 2.1)
- NativeWind v4 + "Warm Dusk" tokens in `apps/mobile/tailwind.config.js` (colors, 8px
  spacing, type scale, radius). `src/theme/tokens.ts` is the programmatic mirror for raw
  values; `src/theme/variants.ts` holds the pure variant→className maps (unit-tested).
- Foundation primitives in `src/components/` (UX-DR7): `Text`, `Button` (primary/secondary/
  voice/icon), `Card`, `ScreenContainer`, `Avatar`, `Toggle`, `Icon`. Interactive ones carry
  `accessibilityRole`/label, ≥48px targets, and logical start/end insets (UX-DR14).
- `global.css` is imported once in `app/_layout.tsx`; Metro wires NativeWind via
  `metro.config.js`; Babel preset uses `jsxImportSource: 'nativewind'`. RN tooling configs
  (babel/metro/tailwind) are CommonJS and exempted in `eslint.config.mjs`.
- Mobile has no RN test renderer yet; pure logic (`theme/variants.ts`, `auth/jwt.ts`) is
  tested via node:test + tsx: `node --import tsx --test src/**/*.test.ts` (from apps/mobile).

## Auth / identity (Story 2.2)
- API identity module (`services/api/src/modules/identity`): `GET /me` verifies the Cognito
  ID token (aws-jwt-verify) and find-or-creates the `users` record (FR1) — first call after
  sign-in creates it, returning sign-ins reuse it. Verifier + service are injectable in
  `createApp({ verifier, identityService })` for tests (no DB/Cognito needed).
- DB layer: lazy `pg` pool (`db/pool.ts`), snake↔camel mapping in repositories only
  (`db/mapping.ts`), forward-only migration runner `pnpm --filter @caraoke/api migrate`
  (needs `DATABASE_URL`); first migration creates `users`.
- Cognito module adds federated Apple/Google IdPs + hosted-UI OAuth (code+PKCE). Provider
  credentials are sensitive vars set out-of-band (empty disables that IdP); never committed.
- Mobile: `useCognitoSignIn` runs the hosted-UI OAuth via expo-auth-session; the ID token is
  stored in expo-secure-store and tracked in `useAuthStore` (Zustand). `useMe` (TanStack
  Query) hits `/me`. `app/(onboarding)/sign-in.tsx` is the one-tap Apple/Google screen; the
  home route redirects there when signed out. Public config via `EXPO_PUBLIC_*` env.
- Profile/deletion (Story 2.3): `PATCH /me` (Zod-validated, requires ≥1 field) and
  `DELETE /me` extend the identity module. Deletion removes personal data first (DB cascade,
  FR6) then the federated identity via the `UserDirectory` port (live `CognitoUserDirectory`
  = AdminDeleteUser; `NoopUserDirectory` for mock/test). Migration convention: every
  personal-data table FKs `users(id) ON DELETE CASCADE`. Mobile `app/profile/index.tsx`
  edits the display name and has a confirmed, irreversible "Delete account" (Alert →
  DELETE → signOut).
- Spotify Premium (Story 2.4, FR2): Spotify behind an integration abstraction in the API
  (`integrations/spotify`, live Web-API + sandbox mock by `CARAOKE_INTEGRATIONS`; mock token
  containing "free" → non-Premium). `POST /me/spotify` verifies Premium via the provider and
  upserts `spotify_accounts` (one per user, FK ON DELETE CASCADE); `GET /me/spotify` returns
  status. Non-Premium is stored as linked-but-not-premium — never silently accepted. Mobile
  `useSpotifyAuth` runs Spotify OAuth (code+PKCE); `app/spotify/index.tsx` shows
  Premium-verified or a non-Premium upgrade path (opens spotify.com/premium). Needs
  `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`.

## i18n / language (Story 2.5)
- `packages/shared/languages.ts` is the source of truth: 25 `SUPPORTED_LANGUAGES` (incl. RTL
  ar/he/fa/ur), `languageSchema` (Zod enum), `resolveLanguage(locale)`, `isRtlLanguage`.
- API: `users.language_pref` (migration 0003, default 'en'); `PATCH /me` accepts
  `languagePref` (validated by the shared enum); `/me` returns it. This is the per-user
  agent speech language (FR4) and UI language (FR5), independent of the partner.
- Mobile: i18next + react-i18next initialized once in `src/i18n` (default = device locale via
  expo-localization → `resolveLanguage`); strings externalized in `src/i18n/locales/*.json`
  (en complete; fr/ar partial, English fallback). `useLocale().change(code)` switches i18next,
  applies RTL via `I18nManager` (UX-DR13), and persists via `PATCH /me`. `app/settings/
  language.tsx` is the 25-language picker; the home route applies the saved pref on load.
  Add new screens' strings to the locale JSON — do not hardcode.

## Pairing (Story 3.1)
- New `pairing` module (`services/api/src/modules/pairing`): `POST /sessions` creates a
  `sessions` row (migration 0004; status from the shared SessionStateMachine, starts
  `pairing`; host_user_id FK ON DELETE CASCADE) and returns the invite — a 6-char
  unambiguous pairing code + an invite URL encoding a single-use base64url token — expiring
  after `SESSION_INVITE_TTL_MINUTES` (default 15). Raw invite token is never on the public
  session object. `PairingService` retries on the rare code/token unique collision.
  `INVITE_BASE_URL` (default https://caraoke.app) builds the `/join?token=` URL.
- Mobile: `src/api/pairing.ts` + `app/session/create.tsx` (create invite, show code + link,
  native Share), linked from home as "Start a duet". Story 3.2 will add joining.

## Phase 0 harness (throwaway)
- `tools/phase0-harness/` is a THROWAWAY two-phone validation prototype (Story 1.3),
  intentionally OUTSIDE the pnpm workspace. Install separately (`cd tools/phase0-harness &&
  npm install`). NFR21 invariant: WebRTC carries voice only; each phone plays its own Spotify
  via the Web API — the song is never sent peer-to-peer (see `app/src/lib/voicePeer.ts`).
- Pure clock/scheduling + measurement logic is unit-tested: `pnpm --dir tools/phase0-harness
  test` (node:test via tsx; no phones/RN install required). `measure/` holds the drift
  sampler, voice-latency probe, and go/no-go report; `pnpm --dir tools/phase0-harness report`
  turns a saved `results/session-*.json` into a report scoring drift vs ≤50ms (NFR2) and
  one-way voice vs ≤150ms (NFR3) with a GO/NO-GO recommendation.

## Feature Development Quality Standards

**CRITICAL**: All new features MUST meet the following mandatory requirements before being considered complete.

### Testing Requirements

- **Minimum Coverage**: 85% code coverage ratio required for all new code
- **Test Pass Rate**: 100% - all tests must pass, no exceptions
- **Test Types Required**:
  - Unit tests for all business logic and services
  - Integration tests for API endpoints or main functionality
  - End-to-end tests for critical user workflows
- **Coverage Validation**: Run coverage reports before marking features complete:
  ```bash
  # Examples by language/framework
  npm run test:coverage
  pytest --cov=src tests/ --cov-report=term-missing
  cargo tarpaulin --out Html
  ```
- **Test Quality**: Tests must validate behavior, not just achieve coverage metrics
- **Test Documentation**: Complex test scenarios must include comments explaining the test strategy

### Git Workflow Requirements

Before moving to the next feature, ALL changes must be:

1. **Committed with Clear Messages**:
   ```bash
   git add .
   git commit -m "feat(module): descriptive message following conventional commits"
   ```
   - Use conventional commit format: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, etc.
   - Include scope when applicable: `feat(api):`, `fix(ui):`, `test(auth):`
   - Write descriptive messages that explain WHAT changed and WHY

2. **Pushed to Remote Repository**:
   ```bash
   git push origin <branch-name>
   ```
   - Never leave completed features uncommitted
   - Push regularly to maintain backup and enable collaboration
   - Ensure CI/CD pipelines pass before considering feature complete

3. **Branch Hygiene**:
   - Work on feature branches, never directly on `main`
   - Branch naming convention: `feature/<feature-name>`, `fix/<issue-name>`, `docs/<doc-update>`
   - Create pull requests for all significant changes

4. **Ralph Integration**:
   - Update .ralph/@fix_plan.md with new tasks before starting work
   - Mark items complete in .ralph/@fix_plan.md upon completion
   - Update .ralph/PROMPT.md if development patterns change
   - Test features work within Ralph's autonomous loop

### Documentation Requirements

**ALL implementation documentation MUST remain synchronized with the codebase**:

1. **Code Documentation**:
   - Language-appropriate documentation (JSDoc, docstrings, etc.)
   - Update inline comments when implementation changes
   - Remove outdated comments immediately

2. **Implementation Documentation**:
   - Update relevant sections in this @AGENT.md file
   - Keep build and test commands current
   - Update configuration examples when defaults change
   - Document breaking changes prominently

3. **README Updates**:
   - Keep feature lists current
   - Update setup instructions when dependencies change
   - Maintain accurate command examples
   - Update version compatibility information

4. **@AGENT.md Maintenance**:
   - Add new build patterns to relevant sections
   - Update "Key Learnings" with new insights
   - Keep command examples accurate and tested
   - Document new testing patterns or quality gates

### Feature Completion Checklist

Before marking ANY feature as complete, verify:

- [ ] All tests pass with appropriate framework command
- [ ] Code coverage meets 85% minimum threshold
- [ ] Coverage report reviewed for meaningful test quality
- [ ] Code formatted according to project standards
- [ ] Type checking passes (if applicable)
- [ ] All changes committed with conventional commit messages
- [ ] All commits pushed to remote repository
- [ ] .ralph/@fix_plan.md task marked as complete
- [ ] Implementation documentation updated
- [ ] Inline code comments updated or added
- [ ] .ralph/@AGENT.md updated (if new patterns introduced)
- [ ] Breaking changes documented
- [ ] Features tested within Ralph loop (if applicable)
- [ ] CI/CD pipeline passes

### Rationale

These standards ensure:
- **Quality**: High test coverage and pass rates prevent regressions
- **Traceability**: Git commits and .ralph/@fix_plan.md provide clear history of changes
- **Maintainability**: Current documentation reduces onboarding time and prevents knowledge loss
- **Collaboration**: Pushed changes enable team visibility and code review
- **Reliability**: Consistent quality gates maintain production stability
- **Automation**: Ralph integration ensures continuous development practices

**Enforcement**: AI agents should automatically apply these standards to all feature development tasks without requiring explicit instruction for each task.
