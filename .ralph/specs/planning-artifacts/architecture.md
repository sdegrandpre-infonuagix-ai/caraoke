---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
workflowType: 'architecture'
project_name: 'caraoke'
user_name: 'BMad'
date: '2026-06-21'
lastStep: 8
status: 'complete'
completedAt: '2026-06-21'
supersedes:
  - ARCHITECTURE.md (deprecated legacy — peer-to-peer playback-sync model)
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 48 FRs across 8 domains. Architecturally they cluster into five runtime subsystems plus two supporting planes:
- **Identity & Profile** (FR1–6): accounts, Spotify-Premium linking/verification, per-user language preference, GDPR/Law-25 deletion.
- **Session Control Plane** (FR7–17): pairing/invite, ready-handshake, and the xAI Voice Agent as orchestrator (voice intent → MCP tool calls → simultaneous start → voice-driven error/feedback). Eyes-free is a hard constraint on every in-session interaction.
- **Playback Coordination Plane** (FR18–21): two INDEPENDENT Spotify streams, started in lockstep, with drift monitoring + correction. No song audio crosses the wire.
- **Live Voice Plane** (FR22–26): full-duplex WebRTC-class voice, consent-gated capture, auto-reconnect + resync within a continuity window.
- **Discovery Plane** (FR27–32): opt-in, coarse Plus-Code, add-then-go-dark, adults-only.
- **Trust/Safety/Privacy** (FR33–37): mute/block/report, voice rapid-disconnect, data controls, abuse pipeline.
- **Billing & Admin** (FR38–48): Stripe subscription rail (SAQ-A), receipts, and an admin/ops console (dashboards, payments, account/T&S management).

**Non-Functional Requirements:** 21 NFRs. The shape-drivers:
- **Latency budgets (NFR1–5):** ≤200ms simultaneous-start, ≤50ms drift (PROVISIONAL — Phase 0), ≤150ms one-way voice (PROVISIONAL — Phase 0), ≤200ms UI, edge-served media with regional fallback. → forces an edge-first media topology and a native, off-JS-thread audio path.
- **Security/Privacy (NFR6–11):** encryption in transit + at rest + E2E voice media; PCI SAQ-A via Stripe; ephemeral voice, no biometrics; coarse ephemeral location, never a trail; GDPR/CCPA + PIPEDA/Quebec Law 25 with Canadian data residency; RBAC + 18+ gate.
- **Scale/Reliability (NFR12–16):** ≥50 concurrent paired sessions, 10× headroom <10% degradation, ≥90% session continuity, ≤60s reconnect window, ≥99.5% backend availability, graceful third-party degradation.
- **Accessibility/Integration (NFR17–21):** eyes-free/hands-free default, WCAG 2.1 AA for setup UI, 25-language UI + agent speech, provider abstraction for every critical third party, honor provider terms (NO peer-to-peer re-streaming of Spotify audio).

**Scale & Complexity:**
- Primary domain: Mobile (React Native shell + native Swift/Kotlin audio engine) + real-time backend on AWS edge.
- Complexity level: High — three stacked real-time problems (lockstep start, cross-stream drift, low-latency duplex voice) over a multi-provider critical path, built by a two-person team.
- Estimated architectural components (provisional): ~9–11 — RN app shell, native audio module, session/signaling service, voice media relay (TURN/SFU-class), Spotify integration (MCP) service, xAI agent integration, discovery service, billing service, telemetry/analytics pipeline, admin console, identity/auth.

### Technical Constraints & Dependencies

- **Architectural law:** voice-only sync over independent simultaneous Spotify playback. Song audio bytes MUST NOT traverse Caraoke infrastructure (licensing + the PRD's core thesis).
- **Hybrid runtime mandate:** latency-critical path (mic capture, WebRTC voice, audio-focus over Spotify) lives in native modules, off the JS thread; RN owns UI/nav/i18n/flows.
- **Critical-path third parties, each behind an internal abstraction (NFR20):** Spotify Premium API/MCP, xAI Voice Agent, Stripe, Google Plus Codes (Open Location Code), APNs/FCM.
- **Online-only MVP:** no offline mode; core loop requires live connectivity.
- **Two-person team:** bias toward boring, managed, swappable infrastructure; isolate native complexity to one module.

### Cross-Cutting Concerns Identified

- **Real-time latency budgeting & clock/drift correction** across two un-synchronized Spotify streams.
- **Edge-first media topology** (relays near carrier/5G edge) as the primary lever for the voice/start targets, with regional fallback that costs latency but never breaks sessions.
- **Eyes-free / voice-first interaction** as a system-wide invariant, not a feature — every in-session flow (start, handshake, error, reconnect, feedback) must be operable without screen.
- **Provider abstraction & graceful degradation** for all five critical dependencies.
- **Privacy by construction** — ephemeral voice, coarse + one-shot location, encryption everywhere, Canadian residency.
- **Observability** — the "felt-together" + real-time-metric telemetry pipeline is itself a product surface (Journey 4 / admin), not an afterthought.
- **Internationalization** — 25-language UI + agent speech baked into the foundation.

### Platform & Deployment Direction (provisional — to be formalized in technology decisions)

**Launch geography:** Montreal, Canada (first real pairs: founder + Maria).

**Region & residency:**
- Backbone region: `ca-central-1` (physically Montreal) — latency + data residency.
- Data residency = Canada by default. Regulatory regime includes PIPEDA + Quebec Law 25 (now reflected in PRD NFR10).

**Compute / platform (provisional, all behind NFR20 abstractions):**
- Spotify MCP server: AWS ECS Express Mode (stateless HTTP, `streamable-http` transport; auto ALB/SSL/URL/autoscaling — confirmed real via AWS docs, post-Jan-2026 GA).
- Control/REST API + integration services: ECS Express Mode.
- Ready/start handshake: AppSync Events (pub/sub channel namespace), using a SCHEDULED-START pattern ("start at absolute T" + clock-synced clients) to hit NFR1 ≤200ms — NOT fire-and-forget "start now".
- Auth: Amazon Cognito.
- Secrets (xAI/Grok key): AWS Secrets Manager, accessed via thin Lambda; key never reaches the device.

**Voice media plane (the hard NFR — separate from Express Mode):**
- WebRTC SFU/TURN relay placed in the **Montreal Bell AWS Wavelength Zone** (carrier 5G edge), parent region `ca-central-1`. Stateful, UDP, latency-pinned — explicitly NOT an ECS Express Mode workload. (Confirm zone availability at provisioning time.)

**Phase 0 validation (made concrete):**
- Measure real backing-track drift + one-way voice latency on Bell 5G in Montreal, two cars on real highway, over the actual Wavelength media path. This is the PRD's go/no-go gate.

## Starter Template Evaluation

### Primary Technology Domain
Mobile (React Native) with deep custom native audio, plus TypeScript backend services on AWS.

### Starter Options Considered
- **Bare React Native CLI** — historically required for heavy native modules; now means manual Xcode/Gradle upkeep. Rejected: maintenance cost too high for a 2-person team.
- **Expo SDK 56 (dev client + CNG + local modules)** — SELECTED. Supports our Swift/Kotlin audio engine via local Expo Modules; WebRTC via `@config-plugins/react-native-webrtc`; keeps EAS Build + OTA updates. (Verified current June 2026: Expo SDK 56 ships RN 0.85.2 / React 19.2.3.)
- **Flutter** — rejected: PRD mandates React Native; native audio ecosystem less aligned.

### Selected Starter: Expo (SDK 56) — managed workflow with dev client

**Rationale:** Native depth (Swift/Kotlin local modules for the latency-critical audio path, off the JS thread) WITHOUT abandoning the managed toolchain. CNG (Continuous Native Generation) eliminates manual native project upkeep; EAS Build/Update accelerate a tiny team; config plugins cover WebRTC. The 2026 consensus is the Expo-vs-bare gap has closed — local modules + dev client give bare-level native depth inside the managed workflow.

**Initialization Command (first implementation story):**
```bash
npx create-expo-app@latest caraoke-mobile
npx expo install expo-dev-client
# native audio: scaffold a LOCAL Expo Module (Swift/Kotlin)
npx create-expo-module@latest --local
# WebRTC (used by LiveKit under the hood):
npx expo install react-native-webrtc @config-plugins/react-native-webrtc
```

**Architectural Decisions Provided / Implied:**
- **Language & Runtime:** TypeScript; RN 0.85.2 / React 19.2.3 (Expo SDK 56).
- **Native path:** Local Expo Modules (Swift + Kotlin) for mic capture, WebRTC voice, audio-focus over Spotify — auto-linked, off the JS thread.
- **Build/Deploy:** EAS Build + EAS Update (OTA) for JS-layer fixes; dev client (not Expo Go) since custom native code is required.
- **Native config:** CNG (`expo prebuild`) — no hand-edited Xcode/Gradle. (Note: WebRTC plugin sets Android `minSdk` 24, disables iOS Bitcode.)
- **i18n:** externalized strings from day one (`expo-localization` + an i18n lib) for the 25-language MVP.

### Repository Foundation
- **Monorepo (pnpm workspaces, optionally Turborepo):** `apps/mobile` (Expo), `services/*` (Express on ECS Express Mode), `packages/shared` (shared TypeScript types — session, pairing, FR models — shared between app and backend).
- **Backend services:** lean TypeScript + Express (no heavy boilerplate), containerized for ECS Express Mode. Node LTS pinned at init.

### Voice Plane Decision (provisional): LiveKit, self-hosted

**Decision:** Use **LiveKit (open-source, self-hosted SFU)** for the live full-duplex voice plane, **not** a hand-rolled raw-`react-native-webrtc` stack and **not** Daily.

**Composition note:** LiveKit's React Native SDK is built on top of `react-native-webrtc` — they coexist. Choosing LiveKit means we still install `react-native-webrtc` (via the starter's config plugin) but gain an SFU + client SDK rather than building signaling/reconnection/adaptation ourselves.

**Rationale (scored against locked decisions):**
- **Edge + residency:** self-hostable SFU → runs in `ca-central-1` and, when justified, in the **Montreal Bell Wavelength Zone** — honors ≤150ms edge latency AND Canadian residency (Law 25). Daily is cloud-only/US-based (residency = enterprise-only) → eliminated by our edge + residency foundations.
- **Two-person team:** reconnection, adaptive bitrate, RN SDK v2, and telemetry are built-in vs. weeks of undifferentiated work on raw WebRTC.
- **Latency reality:** on cellular, carrier-grade NAT forces media through a TURN/edge relay anyway, so "P2P is lower latency" is largely a myth here — a LiveKit SFU at the edge is the same practical hop count as a hand-rolled coturn relay, with far more capability.
- **Group-session Vision:** SFU scales to 3+ cars (PRD Vision); raw P2P mesh does not.
- **Swappable (NFR20):** open-source, behind the media-provider abstraction.

**Phased ops path (de-risks edge):**
1. Phase 0: LiveKit self-hosted in `ca-central-1` (standard region) — fastest to measure real Bell-cellular drift/voice latency.
2. If Phase 0 needs the last few ms: relocate the SFU node into the Bell Wavelength Zone (same deployment shape, carrier-edge placement).

**Note:** Project initialization (Expo app + monorepo scaffold) should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data stores: Aurora Serverless (PostgreSQL 17.9) + Redis (ElastiCache).
- Service topology: modular monolith (core API) + separate Spotify MCP, LiveKit, and task Lambdas.
- Auth/RBAC: Cognito (user/admin groups).
- Voice plane: LiveKit self-hosted (recorded in Starter step).
- Real-time mechanisms: clock-synced scheduled-start (NFR1); drift-monitoring hooks (NFR2).

**Important Decisions (Shape Architecture):**
- Telemetry pipeline (Firehose → S3 → Athena/QuickSight + CloudWatch metrics).
- Mobile state model (Zustand + TanStack Query), navigation (Expo Router).
- API conventions (REST + AppSync Events + Zod + OpenAPI + shared types).
- Age verification via third-party provider behind an abstraction.

**Deferred Decisions (Post-MVP / pending Phase 0):**
- Final drift-correction algorithm (finalize after Phase 0 latency data).
- Wavelength edge placement of the LiveKit SFU (switch on when Phase 0 justifies).
- Group-session media topology (Vision phase; LiveKit SFU already supports it).

### Data Architecture
- **System of record — Aurora Serverless, PostgreSQL 17.9** (`ca-central-1`, scales to zero). Holds accounts, profiles, language prefs, saved partners, subscriptions/billing, T&S records, discovery opt-in. Relational chosen for transactional integrity and clean Law 25 / GDPR cascading data-subject deletion.
- **Ephemeral + real-time — Redis (ElastiCache).** Live session/presence state, ready-handshake coordination, and TTL-native ephemeral discovery entries (enables "add-then-go-dark" structurally). Also required as LiveKit's distributed-state backend — reused, not added.
- **Telemetry/analytics — Kinesis Data Firehose → S3 (Parquet) → Athena/QuickSight** for the admin dashboards (FR44, Journey 4), plus **CloudWatch custom metrics + alarms** for live ops alerting (drift/latency p95). Kept inside AWS Canada to preserve residency (a third-party analytics SaaS would risk NFR10).
- **No DynamoDB in MVP** — Redis covers ephemeral needs; revisit only if durable high-volume session history is needed.

### Authentication & Security
- **Amazon Cognito** for authentication; **RBAC via Cognito groups** (`user` vs `admin` — gates the ops/billing console, FR44–48).
- **Age verification (FR32/NFR11):** a **third-party age-verification/identity provider behind an internal `AgeVerification` abstraction** (NFR20). Natural candidate: **Stripe Identity** (we already run Stripe), swappable for Persona/Yoti-class. Required only for stranger discovery; known-partner duets exempt.
- **Encryption (NFR6):** TLS 1.2+ in transit; **SRTP/DTLS end-to-end** on LiveKit voice media; **AWS KMS** at rest (Aurora, Redis, S3). No personal/voice/location data in plaintext.
- **PCI (NFR7):** Stripe-only cardholder data → SAQ-A. Grok/xAI key in Secrets Manager, brokered via Lambda — never on device.

### API & Communication Patterns
- **Topology: modular monolith** — core API is one Express (TypeScript) deployable on **ECS Express Mode**. Separated only where genuinely distinct: **Spotify MCP server** (ECS Express), **LiveKit** (self-hosted SFU), and **task Lambdas** (Stripe webhooks, Grok-key broker, age-verification callbacks). Minimizes moving parts for a two-person team.
- **Request/response:** REST over the Express monolith.
- **Real-time pub/sub:** **AppSync Events** (ready-handshake, scheduled-start, reconnection events).
- **Media + low-level data:** LiveKit tracks + data channels.
- **Conventions:** **Zod** for runtime validation + inferred types, shared via `packages/shared`; **OpenAPI** docs; single consistent error envelope.

### Frontend (Mobile) Architecture
- **State:** **Zustand** (UI/session/client state) + **TanStack Query** (server state) — server data never duplicated into Zustand.
- **Navigation:** **Expo Router** (file-based).
- **Native bridge:** Expo Modules event emitters between the Swift/Kotlin audio engine and JS; latency-critical logic stays native, off the JS thread.
- **i18n:** `expo-localization` + i18n library; externalized strings from day one (25-language MVP).

### Infrastructure & Deployment
- **IaC:** Terraform. **CI/CD:** GitHub Actions → ECR → ECS Express (backend); EAS Build + EAS Update (mobile).
- **Environments:** `dev` + `prod` (lean). **Region:** `ca-central-1`; LiveKit SFU → Bell Wavelength Zone when Phase 0 justifies.
- **Monitoring:** CloudWatch logs/metrics/alarms + the analytics pipeline.
- **Scaling:** ECS Express autoscaling; Aurora Serverless autoscaling; LiveKit horizontal via Redis.

### Real-Time Design Points (the hard NFRs)
- **Clock-synced scheduled-start (NFR1, ≤200ms):** clients derive a server-time offset (round-trip / AppSync server timestamp). The Voice Agent issues **"start at absolute epoch T"** (T = now + pre-roll buffer); each client pre-buffers the Spotify track **paused**, then unpauses at T on its corrected clock. Avoids fire-and-forget "start now" jitter.
- **Drift monitoring + correction (NFR2, ≤50ms, PROVISIONAL):** clients periodically report playback-position-vs-wallclock over the LiveKit data channel; coordinator detects drift; correction via micro-seek/nudge on the lagging client. Monitoring hooks built in MVP; correction algorithm finalized after Phase 0.

### Decision Impact Analysis

**Implementation Sequence (suggested):**
1. Repo + Expo app scaffold (monorepo, shared types).
2. Identity/auth (Cognito) + profile + Aurora schema + Law 25 deletion paths.
3. Pairing + AppSync Events handshake; clock-sync primitive.
4. Native audio module + LiveKit voice plane (Phase 0 measurement harness).
5. Spotify MCP + scheduled-start + drift monitoring.
6. xAI Voice Agent orchestration (intent → MCP → start → feedback).
7. Discovery (Plus Codes + Redis TTL + age verification).
8. Stripe billing + admin console + telemetry pipeline.

**Cross-Component Dependencies:**
- Scheduled-start depends on the clock-sync primitive (build early, used by both playback and voice).
- Discovery depends on age-verification abstraction + Redis TTL.
- Admin dashboards depend on the telemetry pipeline + CloudWatch metrics.
- LiveKit depends on Redis (shared with ephemeral session state).
- All third parties (Spotify, xAI, Stripe, Plus Codes, age-verification, APNs/FCM) sit behind NFR20 abstractions.

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified
Naming (DB/API/code), wire format, project structure, event conventions, state management, error/loading handling, and the boundary mapping between snake_case DB and camelCase wire.

### Naming Patterns
**Database (PostgreSQL):** snake_case, plural tables (`users`, `sessions`, `saved_partners`); columns snake_case (`language_pref`, `created_at`); PK `id` = **UUID v7** (time-ordered); FK `<entity>_id` (`user_id`); timestamps `created_at`/`updated_at`; indexes `idx_<table>_<cols>`.
**API (REST):** plural lowercase resources (`/sessions`, `/saved-partners`); path params `:id`; query params + JSON bodies **camelCase**.
**Wire ↔ DB boundary:** DB is snake_case; everything on the wire and in TS is **camelCase** — mapping happens in the repository layer, never leaks snake_case to clients.
**Code (TypeScript):** Components `PascalCase.tsx` (`SessionCard.tsx`); hooks/modules camelCase (`useSession.ts`, `sessionService.ts`); functions/vars camelCase; types/interfaces PascalCase; constants UPPER_SNAKE.

### Structure Patterns
**Monorepo:** `apps/mobile` (Expo) · `services/api` (modular monolith) · `services/spotify-mcp` · `packages/shared` (types + Zod schemas) · `packages/config` (eslint/tsconfig) · `infra` (Terraform).
**Backend module (per domain):** `services/api/src/modules/<domain>/` → `<domain>.router.ts`, `.service.ts`, `.repository.ts`, `.schema.ts` (Zod), `.types.ts`. Domains: `identity`, `pairing`, `session`, `discovery`, `billing`, `safety`, `telemetry`, `admin`.
**Mobile:** `app/` (Expo Router routes) · `src/features/<feature>/` · `src/components/` (shared) · `src/native/` (module bridges) · `src/stores/` (Zustand) · `src/api/` (TanStack Query hooks) · `src/i18n/`.
**Tests:** co-located `*.test.ts(x)` for unit; `tests/e2e/` for end-to-end.

### Format Patterns
- **Uniform response envelope (ALL responses):** every API response is `{ data: <T> | null, error: <ErrorObj> | null }` — exactly one is non-null.
  - **Success (single):** `{ data: <resource>, error: null }` with proper 2xx.
  - **Success (collection):** `{ data: { items: [...], nextCursor?: string }, error: null }`.
  - **Failure:** `{ data: null, error: { code: string, message: string, details?: object } }` with proper 4xx/5xx. `code` is a stable machine string (e.g., `PREMIUM_REQUIRED`, `SESSION_NOT_FOUND`).
- **Dates:** ISO 8601 UTC strings. **Money:** integer minor units + ISO currency (Stripe convention). **Booleans:** true/false. **Null:** explicit; never `undefined` on the wire.

### Communication Patterns
- **Domain events (AppSync Events):** name `domain.action` past tense (`session.started`, `partner.ready`, `session.reconnecting`, `playback.scheduled`). Envelope: `{ type, version, sessionId, occurredAt, data }` — versioned from day one.
- **State (Zustand):** immutable updates only; stores `useXStore`; in-session lifecycle is an explicit **state machine** (`idle → pairing → ready → playing → reconnecting → ended`).
- **Server state (TanStack Query):** structured query keys (`['session', id]`); server data NEVER copied into Zustand.
- **Logging:** structured JSON; levels error/warn/info/debug; every log carries `requestId`/`sessionId`; **no PII, voice, or precise location in logs** (NFR6/8/9).

### Process Patterns
- **Validation:** Zod at every boundary (API input, event payloads, env vars). Validate-then-act.
- **Errors:** central Express error middleware → uniform error envelope; typed `AppError(code)`. Mobile: error boundaries + Query error states; **in-session errors surface voice-first** (PRD law).
- **Retries:** only idempotent ops; exponential backoff + jitter; honor provider rate limits (NFR21).
- **Auth:** Cognito JWT `Authorization: Bearer`; verified in middleware; RBAC via Cognito group claim.

### Enforcement Guidelines
**All agents MUST:** return the uniform `{ data, error }` envelope from every endpoint; use shared types from `packages/shared` (never redefine); validate boundaries with Zod; map snake_case↔camelCase only in repositories; emit versioned events; keep voice/PII/location out of logs.
**Tooling:** TypeScript `strict`; shared ESLint + Prettier (`packages/config`); Conventional Commits; CI gate blocks on lint/type/test. This document is the source of truth for conventions.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
caraoke/
├── package.json                  # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                    # Turborepo pipeline
├── tsconfig.base.json
├── .gitignore  .env.example  README.md
├── .github/workflows/
│   ├── ci.yml                    # lint + typecheck + test (CI gate)
│   ├── deploy-api.yml            # build → ECR → ECS Express
│   └── mobile-eas.yml            # EAS Build / Update
│
├── tools/
│   └── phase0-harness/           # Validation prototype (PRD Phase 0 gate) — FIRST story
│       ├── README.md             # protocol: 2 phones, Bell 5G, Montreal highway
│       ├── package.json
│       ├── app/                  # throwaway Expo client: manual simultaneous start,
│       │                         #   WebRTC voice (no xAI agent), dual-Spotify playback
│       ├── measure/              # drift sampler (position vs wallclock) + voice-latency probe
│       └── results/              # logged drift/latency runs + "felt-together?" responses
│
├── apps/
│   ├── mobile/                   # Expo SDK 56 (RN 0.85) — routes PROVISIONAL pending UX spec
│   │   ├── app.config.ts  eas.json  package.json
│   │   ├── app/                  # Expo Router routes
│   │   │   ├── _layout.tsx  index.tsx
│   │   │   ├── (auth)/  (onboarding)/  session/  discovery/  profile/  billing/
│   │   ├── src/
│   │   │   ├── features/         # auth, profile, pairing, session, discovery, safety, billing
│   │   │   ├── components/       # shared UI
│   │   │   ├── native/           # JS bridges to local Expo Modules
│   │   │   ├── stores/           # Zustand (useSessionStore, etc.)
│   │   │   ├── api/              # TanStack Query hooks
│   │   │   ├── i18n/             # 25-language strings
│   │   │   └── lib/              # clock-sync, livekit client, agent client
│   │   ├── modules/              # LOCAL Expo Modules (native audio)
│   │   │   └── caraoke-audio/    # Swift + Kotlin: mic, WebRTC, audio-focus over Spotify
│   │   └── tests/  e2e/
│   │
│   └── admin/                    # Ops console (web) — billing/T&S actions + embedded dashboards
│       ├── package.json
│       └── src/                  # FR44–48: subscriptions, refunds, disputes, suspend, QuickSight embeds
│
├── services/
│   ├── api/                      # Modular monolith (Express + TS) on ECS Express Mode
│   │   ├── package.json  Dockerfile
│   │   ├── src/
│   │   │   ├── main.ts  app.ts   # bootstrap + middleware (auth, error envelope, zod)
│   │   │   ├── config/  env.ts   # Zod-validated env
│   │   │   ├── middleware/       # auth (Cognito JWT), rbac, errorHandler, requestContext
│   │   │   ├── modules/
│   │   │   │   ├── identity/     # FR1–6  (account, Spotify link, language, deletion)
│   │   │   │   ├── pairing/      # FR7–11 (invite, join, saved partners, ready-handshake)
│   │   │   │   ├── session/      # FR12–26 (orchestration, scheduled-start, drift hooks, voice lifecycle)
│   │   │   │   ├── discovery/    # FR27–32 (Plus Codes, Redis TTL, age-verify gate)
│   │   │   │   ├── safety/       # FR33–37 (mute/block/report, abuse pipeline)
│   │   │   │   ├── billing/      # FR38–41 (Stripe subscriptions, receipts)
│   │   │   │   ├── telemetry/    # FR42–43 (felt-together, session-health ingest)
│   │   │   │   └── admin/        # FR44–48 (reporting, account/billing ops)
│   │   │   │       └── <each>: .router .service .repository .schema .types
│   │   │   ├── integrations/     # NFR20 abstractions: spotify/ xai/ stripe/ pluscodes/ ageverify/ push/
│   │   │   │                      #   each: index.ts (interface) + live.ts + mock.ts (sandbox)
│   │   │   │                      #   adapter selected by env (CARAOKE_INTEGRATIONS=live|mock)
│   │   │   ├── events/           # AppSync Events publishers + payload schemas
│   │   │   └── db/               # migrations, repository base, snake↔camel mapping
│   │   └── tests/  e2e/  __mocks__/
│   │
│   └── spotify-mcp/              # Spotify MCP server (streamable-http) on ECS Express Mode
│       ├── Dockerfile  package.json
│       └── src/                  # MCP tools the xAI agent calls to trigger playback
│
├── functions/                   # Task Lambdas
│   ├── stripe-webhooks/
│   ├── grok-key-broker/         # fetch xAI key from Secrets Manager
│   └── ageverify-callback/
│
├── packages/
│   ├── shared/                  # types + Zod schemas (session, pairing, events, error codes) — STORY #1
│   └── config/                  # eslint, prettier, tsconfig presets
│
└── infra/                       # Terraform
    ├── modules/                 # ecs-express/ aurora/ redis/ appsync-events/ cognito/
    │   │                        # livekit/ wavelength/ secrets/ firehose-s3-athena/ cloudfront/
    ├── envs/  dev/  prod/
    └── main.tf  variables.tf  outputs.tf
```

### Architectural Boundaries
- **API boundary:** mobile/admin → Express monolith (REST, uniform `{data,error}`). Cognito JWT verified at middleware; RBAC by group.
- **Real-time boundary:** session events flow over AppSync Events (pub/sub); voice/data over LiveKit. No song audio ever crosses Caraoke infra (architectural law).
- **Integration boundary:** every third party (Spotify MCP, xAI, Stripe, Plus Codes, age-verify, APNs/FCM) accessed only through `services/api/src/integrations/*` (NFR20). No module calls a provider SDK directly. Each adapter ships a **`live.ts` + `mock.ts` (sandbox)** behind one interface, selected by env (`CARAOKE_INTEGRATIONS=live|mock`) — enabling offline dev, deterministic CI, and full `session`-flow tests without hitting live providers.
- **Data boundary:** repositories are the only code touching SQL; snake↔camel mapping lives there; Redis accessed via a session-state/presence facade; analytics writes go to Firehose only.
- **Native boundary:** latency-critical audio (mic, WebRTC, audio-focus) lives in `modules/caraoke-audio` (Swift/Kotlin); JS communicates via event emitters only — never blocks the JS thread.

### Requirements → Structure Mapping
| FR Domain | Backend | Mobile/Admin |
|---|---|---|
| Account/Profile/Localization (FR1–6) | `modules/identity` | `features/auth`, `features/profile`, `i18n/` |
| Pairing (FR7–11) | `modules/pairing` | `features/pairing` |
| Voice-Agent Orchestration (FR12–17) | `modules/session`, `integrations/xai` | `features/session`, `lib/agent`, `modules/caraoke-audio` |
| Synchronized Playback (FR18–21) | `modules/session`, `integrations/spotify`, `spotify-mcp` | `lib/clock-sync`, `modules/caraoke-audio` |
| Live Voice Duet (FR22–26) | `modules/session` | `lib/livekit`, `modules/caraoke-audio` |
| Nearby Discovery (FR27–32) | `modules/discovery`, `integrations/pluscodes`, `integrations/ageverify` | `features/discovery` |
| Trust/Safety/Privacy (FR33–37) | `modules/safety` | `features/safety` |
| Billing (FR38–41) | `modules/billing`, `integrations/stripe`, `functions/stripe-webhooks` | `features/billing` |
| Telemetry (FR42–43) | `modules/telemetry`, Firehose→S3→Athena | — |
| Admin/Ops (FR44–48) | `modules/admin` | `apps/admin` |

### Integration Points & Data Flow
- **Start a duet:** mobile → REST (create session) → AppSync Events handshake → agent (via xai integration) calls Spotify MCP → `playback.scheduled{T}` event → both clients pre-buffer & unpause at T → LiveKit voice opens.
- **Drift loop:** clients report position over LiveKit data channel → `session` module detects → correction nudge.
- **Telemetry:** clients/edge emit → `telemetry` ingest → Firehose → S3 → Athena/QuickSight (admin); live metrics → CloudWatch alarms.
- **Discovery:** opt-in writes coarse Plus Code + TTL to Redis → agent reads nearby → add-then-go-dark removes exposure.

### Development Workflow
- **Phase 0 (gate):** `tools/phase0-harness/` is built and run *before* the full stack — measures real backing-track drift + one-way voice latency on Bell 5G in Montreal. If the feeling doesn't hold at achievable drift/latency, stop and rethink (per PRD).
- **Dev:** `pnpm dev` (Turborepo) runs API locally (Docker Postgres + Redis), Expo dev client, admin web. LocalStack optional for AWS services.
- **Build/Deploy:** GitHub Actions → API/MCP containers to ECR → ECS Express; mobile via EAS; infra via `terraform apply` per env.

## Architecture Validation Results

### Coherence Validation ✅
**Decision Compatibility:** Stack is internally consistent — TypeScript end-to-end (Expo SDK 56 / RN 0.85 ↔ Express ↔ shared types); Aurora PostgreSQL 17.9 + Redis + LiveKit (Redis shared); all AWS-native in `ca-central-1`. No version or technology conflicts. Verified current June 2026.
**Pattern Consistency:** Uniform `{data,error}` envelope, snake↔camel boundary, Zod validation, and versioned events all align with the modular-monolith + RN choices.
**Structure Alignment:** Project tree realizes every decision — `integrations/*` enforces NFR20 (live + sandbox mock per adapter); repositories own the data boundary; native module isolates the latency path; `tools/phase0-harness/` gates the real-time risk.

### Requirements Coverage Validation
**Functional (48/48):** Every FR maps to a backend module and (where user-facing) a mobile/admin location — see Requirements→Structure table. No orphans.
**Non-Functional (21/21 addressed):**
- Latency (NFR1–5): clock-synced scheduled-start, drift hooks, LiveKit on Wavelength edge, native audio path. (NFR2/3 PROVISIONAL — Phase 0 gate.)
- Security/Privacy (NFR6–11): TLS/SRTP-DTLS/KMS; Stripe SAQ-A; ephemeral voice + no biometrics; coarse Plus-Code + Redis TTL; Canadian residency + Law 25 deletion; Cognito RBAC + age-verify.
- Scale/Reliability (NFR12–16): ECS Express + Aurora + LiveKit autoscaling; reconnect/resync. ⚠️ see Gap #2.
- Accessibility/Integration (NFR17–21): voice-first invariant; WCAG (pending UX); 25-lang i18n; provider abstractions; no-P2P-restream law.

### Implementation Readiness Validation ✅
Decisions documented with versions; patterns enforceable via shared config + CI; structure complete and specific; integration points and boundaries explicit. AI agents have an unambiguous contract.
**Testability (sandbox mocks):** every `integrations/*` adapter ships a sandbox `mock.ts` behind its interface (env-selected via `CARAOKE_INTEGRATIONS=live|mock`). The full duet flow — pairing → scheduled-start → drift → voice → feedback — is testable deterministically with no live providers. Closes the testability gap raised in structure review.

### Gap Analysis Results

**Important Gaps (not blocking, address before/with build):**
1. **No UX specification.** Mobile route groups and screen flows are architect-inferred (esp. Premium-gate recovery, first-run mic/language). → Run `/create-ux` before or alongside mobile implementation; mobile structure is marked PROVISIONAL.
2. **LiveKit self-host availability (NFR16 ≥99.5%).** A single SFU node is a single point of failure. → MVP: accept with fast restart + health checks, OR run a redundant SFU pair behind LiveKit's distributed mode (Redis already present). Decide at infra time; documented as a known risk.
3. **Load/scale validation (NFR12–13).** ≥50 concurrent sessions + 10× headroom is asserted, not yet tested. → Add a load-test pass once the session loop is built.

**Deferred (known, acceptable):**
- Final drift-correction algorithm → after Phase 0 data.
- Wavelength SFU placement + zone confirmation → operational, at provisioning.
- Group-session media topology → Vision phase (LiveKit already supports).

### Architecture Completeness Checklist
- [x] Requirements analysis · scale/complexity · constraints · cross-cutting concerns
- [x] Decisions with versions · stack · integration patterns · performance
- [x] Naming · structure · communication · process patterns
- [x] Directory structure · boundaries · integration points · FR→structure mapping
- [x] Testability — sandbox mocks per integration

### Architecture Readiness Assessment
**Overall Status:** READY FOR IMPLEMENTATION (with Phase 0 as the explicit go/no-go gate)
**Confidence Level:** High — coherent, fully traced, residency- and latency-aware; the genuine unknowns (drift/voice thresholds) are isolated behind a cheap prototype.
**Key Strengths:** voice-only-sync law honored throughout; edge+residency aligned to Montreal/Bell/Law 25; lean two-person-team topology; every third party swappable + mockable (NFR20); real-time risk de-risked first.
**Areas for Future Enhancement:** UX spec, LiveKit HA, load testing, drift-correction tuning.

### Implementation Handoff
**AI Agent Guidelines:** Follow decisions exactly; use the uniform envelope and shared types; respect module/integration/native boundaries; consult this document for all architectural questions.
**First Implementation Priority:** `tools/phase0-harness/` (validate the feeling) → then `packages/shared` + repo scaffold (Story #1 of the build).
