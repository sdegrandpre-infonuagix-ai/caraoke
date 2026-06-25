# Ralph Fix Plan

## Stories to Implement

### Foundation & the Magic Moment (Phase 0)
> Goal: Scaffold the monorepo and base infra, then prove the duet *feels* real on a Montreal highway before committing to the full build.

- [ ] Story 1.1: Monorepo & Expo app scaffold
  > As a developer
  > I want the pnpm monorepo, Expo SDK 56 app, and shared packages initialized with a CI gate
  > So that all subsequent work has a consistent, type-safe foundation.
  > AC: Given an empty repo, When the scaffold story is complete, Then `apps/mobile` (Expo SDK 56), `services/api`, `packages/shared`, `packages/config` exist in a pnpm workspace, And TypeScript `strict`, shared ESLint/Prettier, and a CI workflow blocking on lint/type/test are configured, And `pnpm dev` and `pnpm build` run successfully across the workspace.
  > Spec: specs/planning-artifacts/epics.md#story-1-1
- [ ] Story 1.2: Base AWS infrastructure skeleton (Terraform)
  > As a developer
  > I want a minimal Terraform-defined infrastructure baseline in `ca-central-1`
  > So that later epics can deploy services into a residency-compliant environment.
  > AC: Given AWS credentials and the `infra/` Terraform modules, When `terraform apply` runs for the `dev` env, Then a VPC, ECS Express service placeholder, Aurora Serverless (PostgreSQL 17.9), Redis, Cognito user pool, and Secrets Manager are provisioned in `ca-central-1`, And all data stores are KMS-encrypted at rest (NFR6), And no resources are provisioned outside Canada (NFR10).
  > Spec: specs/planning-artifacts/epics.md#story-1-2
- [ ] Story 1.3: Phase 0 duet harness (manual two-phone prototype)
  > As a founder
  > I want a throwaway two-phone harness with manual simultaneous start, WebRTC voice, and dual independent Spotify playback
  > So that I can experience and measure a real duet without the full stack.
  > AC: Given two phones on cellular with Spotify Premium, When the operator triggers a manual countdown start, Then both phones begin the same track and open a full-duplex WebRTC voice channel, And the song audio is never transmitted peer-to-peer (only voice) (NFR21), And the harness lives in `tools/phase0-harness/` and is clearly marked throwaway.
  > Spec: specs/planning-artifacts/epics.md#story-1-3
- [ ] Story 1.4: Phase 0 measurement & go/no-go report
  > As a founder
  > I want the harness to measure backing-track drift and one-way voice latency and capture a "felt together?" answer
  > So that I have evidence to decide whether to build the full product.
  > AC: Given a harness session on Bell 5G on a Montreal highway, When a full song completes, Then drift (position vs wallclock) and one-way voice latency are sampled and logged to `results/`, And a spoken "did that feel like singing together?" answer is recorded, And a summary report states measured drift vs ≤50ms (NFR2), latency vs ≤150ms (NFR3), and a go/no-go recommendation.
  > Spec: specs/planning-artifacts/epics.md#story-1-4
- [ ] Story 1.5: Deploy self-hosted LiveKit SFU
  > As a developer
  > I want the self-hosted LiveKit SFU deployed in `ca-central-1`
  > So that the live-voice plane (Epic 4) has a residency-compliant media server to connect to.
  > AC: Given the Terraform infra baseline (Story 1.2), When the LiveKit module is applied, Then a self-hosted LiveKit SFU runs in `ca-central-1`, backed by the existing Redis for distributed state (AR6, NFR10), And it is reachable via the integration abstraction with health checks and a documented path to relocate to the Bell Wavelength Zone when Phase 0 justifies (NFR5), And voice media is encrypted end-to-end (SRTP/DTLS) (NFR6), And this production SFU is independent of the throwaway WebRTC used in the Phase 0 harness (Story 1.3).
  > Spec: specs/planning-artifacts/epics.md#story-1-5
- [ ] Story 1.6: Deploy Spotify MCP server
  > As a developer
  > I want the Spotify MCP server deployed on ECS Express Mode
  > So that the Voice Agent (Epic 4) can trigger Spotify playback via MCP tool calls.
  > AC: Given the Terraform infra baseline (Story 1.2), When the `services/spotify-mcp` server is built and deployed, Then it runs on ECS Express Mode in `ca-central-1` with `streamable-http` transport (AR3), And it exposes the MCP tools needed to control playback, behind the Spotify integration abstraction with a sandbox mock available (NFR20, AR9), And Spotify credentials are sourced from Secrets Manager, never hard-coded, And it honors Spotify provider terms — no peer-to-peer re-streaming of audio (NFR21).
  > Spec: specs/planning-artifacts/epics.md#story-1-6
### Accounts, Profile & Localization
> Goal: Users onboard, link Premium, set language, and control their account.

- [ ] Story 2.1: Design tokens & foundation primitives
  > As a developer
  > I want NativeWind configured with the "Warm Dusk" tokens and the foundation primitive components
  > So that all screens are built consistently and accessibly.
  > AC: Given the mobile app, When primitives are implemented, Then `tailwind.config` defines the Warm Dusk palette, 8px spacing scale, type scale, and radius scale (UX-DR1), And `Button` (4 variants), `Card`, `ScreenContainer`, `Text`, `Avatar`, `Toggle`, `Icon` exist (UX-DR7), And every interactive primitive has `accessibilityLabel`/role, ≥48px targets, and uses logical `start`/`end` props (UX-DR14).
  > Spec: specs/planning-artifacts/epics.md#story-2-1
- [ ] Story 2.2: Sign in with Apple/Google (Cognito)
  > As a new user
  > I want to sign in with Apple or Google
  > So that I can create my Caraoke account in one tap.
  > AC: Given the onboarding screen, When I choose Apple or Google sign-in, Then Cognito authenticates me and a `users` record is created (FR1), And a valid session (JWT) is issued and stored securely, And returning sign-in reuses the existing account.
  > Spec: specs/planning-artifacts/epics.md#story-2-2
- [ ] Story 2.3: Profile management & account deletion
  > As a user
  > I want to view/edit my profile and delete my account and data
  > So that I control my presence and satisfy my privacy rights.
  > AC: Given an authenticated user, When I edit profile fields and save, Then changes persist via the uniform `{data,error}` API (FR1), And when I request account deletion, my account and all associated personal data are removed via cascading deletion (FR6, NFR10), And deletion is confirmed and irreversible.
  > Spec: specs/planning-artifacts/epics.md#story-2-3
- [ ] Story 2.4: Connect & verify Spotify Premium
  > As a user
  > I want to connect my Spotify account and have Premium verified
  > So that the system knows I can participate in duets.
  > AC: Given an authenticated user on the Spotify link screen, When I complete Spotify OAuth, Then the link is stored and Premium status is verified via the Spotify integration (FR2), And a non-Premium account is told plainly and offered an upgrade path (not silently accepted), And the Spotify provider is accessed only via its abstraction with a sandbox mock available (NFR20, AR9).
  > Spec: specs/planning-artifacts/epics.md#story-2-4
- [ ] Story 2.5: Language preference & i18n foundation
  > As a user
  > I want to set my language and have the app and agent speak it
  > So that Caraoke works in my own tongue regardless of my partner's.
  > AC: Given onboarding or profile settings, When I select one of 25 supported languages (defaulting to device locale), Then the full UI renders in that language with externalized strings (FR3, FR5, NFR19), And the Voice Agent's speech language is set to my preference, independent of my partner (FR4), And RTL languages mirror layout via logical props (UX-DR13).
  > Spec: specs/planning-artifacts/epics.md#story-2-5
### Pairing & Partner Connection
> Goal: Two users connect and reach the ready state, hands-free-ready.

- [ ] Story 3.1: Create session & generate invite
  > As a user
  > I want to create a duet session and get an invite link or code
  > So that I can ask someone to sing with me.
  > AC: Given an authenticated user, When I create a session, Then a `sessions` record is created and a valid invite link and pairing code are returned (FR7), And the invite encodes the session and expires after a defined window.
  > Spec: specs/planning-artifacts/epics.md#story-3-1
- [ ] Story 3.2: Join session via invite
  > As an invited user
  > I want to join a session via link or code
  > So that I can connect with the person who invited me.
  > AC: Given a valid, unexpired invite, When I open the link or enter the code, Then I am joined to the session and both partners are shown as connected (FR8), And an invalid or expired invite returns a clear `{error}` and a recovery path.
  > Spec: specs/planning-artifacts/epics.md#story-3-2
- [ ] Story 3.3: Save partners & fast re-pair
  > As a returning user
  > I want to save known partners and re-pair quickly
  > So that singing again is effortless.
  > AC: Given a completed session with a partner, When I save them as a known partner, Then a `saved_partners` record links us (FR9), And re-pairing with a saved partner completes from intent to ready-handshake in ≤10 seconds (FR9).
  > Spec: specs/planning-artifacts/epics.md#story-3-3
- [ ] Story 3.4: Ready-handshake
  > As a user
  > I want both partners confirmed ready before the song starts
  > So that there are no false starts.
  > AC: Given two paired users, When both indicate readiness, Then the system confirms a ready state to both via AppSync Events before any countdown (FR10), And the `SessionStateMachine` transitions `pairing → ready` and is the single source of truth (UX-DR2).
  > Spec: specs/planning-artifacts/epics.md#story-3-4
- [ ] Story 3.5: Push notifications (invites, ready, reconnect)
  > As a user
  > I want push notifications for invitations, partner-ready, and reconnection events
  > So that I never miss a fleeting moment.
  > AC: Given a user with notifications granted, When an invite, partner-ready, or reconnection event occurs, Then a push notification is delivered via APNs/FCM in the user's language (FR11, NFR19), And the push deep-links to the relevant session.
  > Spec: specs/planning-artifacts/epics.md#story-3-5
- [ ] Story 3.6: Clock-sync primitive
  > As a developer
  > I want a server-time offset primitive on each client
  > So that simultaneous start can be scheduled accurately.
  > AC: Given a client establishing a session, When it performs the clock-sync exchange, Then it computes a server-time offset accurate enough to support a ≤200ms scheduled start (AR10, NFR1), And the offset is refreshed periodically and exposed to the playback layer.
  > Spec: specs/planning-artifacts/epics.md#story-3-6
### The Duet (real-time singing loop)
> Goal: The product: two people sing together, hands-free, across distance.

- [ ] Story 4.1: Native audio module & LiveKit live voice
  > As a singer
  > I want my microphone captured (after consent) and my partner's live voice in full duplex
  > So that we hear each other while we sing.
  > AC: Given explicit microphone consent (FR22), When a session's voice plane opens, Then the native audio module captures my mic and transmits full-duplex voice via the LiveKit SFU (FR23), And I hear my partner's live voice layered over my own playback (FR24), And voice media is encrypted end-to-end (SRTP/DTLS) (NFR6).
  > Spec: specs/planning-artifacts/epics.md#story-4-1
- [ ] Story 4.2: SessionStateMachine & sonic services
  > As a developer
  > I want the session state machine and the sonic services in place
  > So that visual and audio feedback stay consistent and the eyes-free experience works.
  > AC: Given the mobile app and native audio module, When sonic services are implemented, Then `SonicEngine`, `RiffVoice`, `AudioDucking`, and `AmbientPresence` exist as native-backed services with TS facades + event bridge (UX-DR3), And ducking lowers the backing track ~12dB / partner ~6dB with 500ms restore and honors the priority stack (UX-DR10), And both visual and sonic layers subscribe to the `SessionStateMachine` (UX-DR2).
  > Spec: specs/planning-artifacts/epics.md#story-4-2
- [ ] Story 4.3: Voice-Agent intent & song request
  > As a user
  > I want to start a session and request a song entirely by voice
  > So that I never touch the screen while driving.
  > AC: Given an active or pairing session, When I say "sing [song] with [partner]", Then the xAI Voice Agent interprets the intent and confirms by restating it (FR12, FR13, UX-DR9), And the agent initiates the requested song for the session via the Spotify MCP, And the agent uses binary-only choices and a failure ladder on misrecognition (UX-DR9).
  > Spec: specs/planning-artifacts/epics.md#story-4-3
- [ ] Story 4.4: Simultaneous scheduled start
  > As a pair of singers
  > I want both phones to start the same song in lockstep
  > So that it feels like one shared performance.
  > AC: Given a ready handshake and clock-sync offset, When the agent triggers start, Then both devices pre-buffer the track paused and unpause at the same absolute timestamp T (FR14, FR18), And the two starts occur within ≤200ms of each other (NFR1), And the song plays independently from each user's own Spotify (no re-streaming) (NFR21).
  > Spec: specs/planning-artifacts/epics.md#story-4-4
- [ ] Story 4.5: Drift monitoring & correction
  > As a singer
  > I want the two backing tracks kept in sync invisibly
  > So that we stay rhythmically together.
  > AC: Given an active duet, When playback positions are reported over the LiveKit data channel, Then the system detects drift between the two streams (FR19), And corrects via micro-seek/nudge on the lagging device, targeting ≤50ms (FR20, NFR2), And correction is imperceptible — no user-facing metric or interruption.
  > Spec: specs/planning-artifacts/epics.md#story-4-5
- [ ] Story 4.6: Voice playback controls
  > As a user
  > I want to start, pause, and stop playback by voice
  > So that I control the session hands-free.
  > AC: Given an active session, When I say pause/stop/resume, Then the action applies and is reflected on both devices (FR21), And all controls are operable eyes-free (FR17).
  > Spec: specs/planning-artifacts/epics.md#story-4-6
- [ ] Story 4.7: Eyes-free driving mode & session screen
  > As a driver
  > I want the screen to go black when moving and Riff to be the only interface
  > So that I never look away from the road.
  > AC: Given the device detects sustained vehicle motion, When driving mode activates, Then `DrivingModeScreen` renders a true-black screen with ambient presence and a tap wakes Riff (voice, not UI) (FR17, UX-DR5), And when stationary, the `WaveformVisualizer` (UI-thread) and `SessionControls` render (UX-DR6, UX-DR12), And motion entry/exit is debounced to avoid red-light flicker.
  > Spec: specs/planning-artifacts/epics.md#story-4-7
- [ ] Story 4.8: Voice-first errors, reconnect & resync
  > As a driver
  > I want dropped connections handled calmly by voice with automatic recovery
  > So that a glitch feels like a pause, not a crash.
  > AC: Given an active duet, When the connection drops, Then Riff announces it by voice and auto-reconnects within the continuity window (≤60s), resyncing on recovery (FR15, FR25, NFR15), And if reconnection fails, the agent ends the session gracefully by voice with a warm next step (FR26), And no modal or screen interaction is required while moving (UX-DR11).
  > Spec: specs/planning-artifacts/epics.md#story-4-8
- [ ] Story 4.9: Post-session "felt together?" capture
  > As a user
  > I want Riff to ask how it felt and capture my spoken answer
  > So that the product's truest metric is measured without a survey.
  > AC: Given a song has just ended, When the 2-second afterglow passes, Then `RiffVoice` asks "did that feel like singing together?" and the native module captures the spoken answer (FR16, FR42, UX-DR16), And there is no visual component for this capture, And the response is stored for telemetry.
  > Spec: specs/planning-artifacts/epics.md#story-4-9
- [ ] Story 4.10: Sonic verification harness
  > As a developer
  > I want automated assertions for the sonic layer
  > So that the primary interface is verified, not shipped on vibes.
  > AC: Given the sonic services, When the harness runs, Then it asserts cue playback per state, ducking levels/curves (−12dB/500ms), ambient-presence-while-black, and the RiffVoice follow-up window (UX-DR4), And it runs in CI alongside the unit suite.
  > Spec: specs/planning-artifacts/epics.md#story-4-10
### Nearby Discovery
> Goal: Spontaneous duets with nearby strangers — safe by construction.

- [ ] Story 5.1: Opt-in discoverability toggle
  > As a user
  > I want discovery off by default and an explicit opt-in
  > So that I am never exposed without choosing to be.
  > AC: Given a user in Discover settings, When I view discovery, Then discoverability is off by default (FR27), And enabling it requires an explicit toggle with a Riff-voiced rationale.
  > Spec: specs/planning-artifacts/epics.md#story-5-1
- [ ] Story 5.2: Age verification (18+) via Stripe Identity
  > As the platform
  > I want stranger discovery gated to verified adults
  > So that minors are not exposed to stranger voice interaction.
  > AC: Given a user enabling discovery for the first time, When the age gate triggers, Then a one-time age verification runs via the age-verification abstraction (Stripe Identity) (FR32, NFR11), And only an `is18Plus` result + verification reference is stored — never the ID document, And under-18/failed verification blocks discovery with a warm explanation.
  > Spec: specs/planning-artifacts/epics.md#story-5-2
- [ ] Story 5.3: Coarse-location publishing (Plus Codes)
  > As a discoverable user
  > I want to be surfaced only by coarse area
  > So that my precise location is never exposed.
  > AC: Given an opted-in, age-verified user with coarse location granted, When discovery is active, Then only a coarse Google Plus-Code area is published to a TTL entry in Redis (FR29, NFR9), And precise coordinates are never stored or transmitted, And the entry expires automatically (no trail).
  > Spec: specs/planning-artifacts/epics.md#story-5-3
- [ ] Story 5.4: Voice read-out of nearby singers
  > As a driver
  > I want to ask Riff who's nearby
  > So that I can find a duet partner hands-free.
  > AC: Given an opted-in user while driving, When I ask "any Caraokes nearby?", Then Riff reads out opted-in users within my coarse area by name (FR28), And an empty pool is handled warmly, never "0 found" (UX-DR8), And only coarse-area matches are surfaced (FR29).
  > Spec: specs/planning-artifacts/epics.md#story-5-4
- [ ] Story 5.5: Add nearby partner & go-dark
  > As a user
  > I want to add a nearby singer and have their location then disappear
  > So that discovery can't become tracking.
  > AC: Given a nearby user surfaced to me, When I add them as a partner, Then they become a saved partner (FR30), And their location is never exposed to me again — no ongoing tracking (FR31), And the add is a one-shot, ephemeral handshake.
  > Spec: specs/planning-artifacts/epics.md#story-5-5
### Trust, Safety & Privacy
> Goal: Users are safe, in control, and protected.

- [ ] Story 6.1: Mute, block & report
  > As a user
  > I want to mute, block, and report another user
  > So that I can protect myself during or after a session.
  > AC: Given an in-progress or past session, When I mute, block, or report a user, Then mute silences their voice immediately, block prevents future pairing, and report files a record (FR33), And these actions are reachable by a single voice command in-session.
  > Spec: specs/planning-artifacts/epics.md#story-6-1
- [ ] Story 6.2: Rapid voice-disconnect
  > As a user
  > I want to leave an uncomfortable session instantly by voice
  > So that I'm never trapped.
  > AC: Given an active session, When I issue the disconnect voice command, Then the session ends immediately for me (FR34), And it is the fastest action available, requiring no screen interaction.
  > Spec: specs/planning-artifacts/epics.md#story-6-2
- [ ] Story 6.3: Independent permission management
  > As a user
  > I want to grant/deny mic, location, and notifications independently
  > So that I share only what I'm comfortable with.
  > AC: Given the app, When I manage permissions, Then mic, location, and notifications are requested just-in-time and independently (FR35), And denying optional permissions degrades gracefully (mic is the only hard requirement).
  > Spec: specs/planning-artifacts/epics.md#story-6-3
- [ ] Story 6.4: Data controls & transparency
  > As a user
  > I want to see and control how my voice, location, and profile data are handled
  > So that I can exercise my privacy rights.
  > AC: Given privacy settings, When I view data handling, Then I see consent status, retention, and processors, and can export/delete my data (FR36, NFR10), And voice is shown as ephemeral with no biometric/voiceprint storage (NFR8).
  > Spec: specs/planning-artifacts/epics.md#story-6-4
- [ ] Story 6.5: Abuse-handling pipeline
  > As an operator
  > I want reported stranger-voice abuse handled systematically
  > So that repeat offenders are managed.
  > AC: Given submitted reports, When the pipeline processes them, Then reports are queued with context for review and repeat-offender thresholds trigger escalation (FR37), And resolution actions are auditable.
  > Spec: specs/planning-artifacts/epics.md#story-6-5
### Billing & Subscriptions
> Goal: The monetization rail — pay to sing.

- [ ] Story 7.1: Stripe subscription & payment method
  > As a user
  > I want to add a payment method and start a subscription via Stripe
  > So that I can pay for Caraoke.
  > AC: Given an authenticated user in the billing section, When I add a payment method and subscribe, Then Stripe handles all cardholder data and Caraoke stores none (FR38, FR41, NFR7), And my subscription status is recorded and gates paid features.
  > Spec: specs/planning-artifacts/epics.md#story-7-1
- [ ] Story 7.2: Plan management
  > As a subscriber
  > I want to view, upgrade, downgrade, and cancel my plan
  > So that I control my spending.
  > AC: Given an active subscription, When I change or cancel my plan, Then the change is applied via Stripe and reflected in my account (FR39), And cancellation stops future billing at period end.
  > Spec: specs/planning-artifacts/epics.md#story-7-2
- [ ] Story 7.3: Billing history & receipts
  > As a subscriber
  > I want to see my billing history and receipts
  > So that I have records of payment.
  > AC: Given past transactions, When I open billing history, Then I see itemized charges and downloadable receipts (FR40).
  > Spec: specs/planning-artifacts/epics.md#story-7-3
- [ ] Story 7.4: Stripe webhook handling
  > As the system
  > I want to process Stripe webhooks
  > So that subscription state stays accurate.
  > AC: Given Stripe billing events, When a webhook is received by the `stripe-webhooks` Lambda, Then it is signature-verified and idempotently applied to subscription state (AR9), And failed/disputed payments update the user's status.
  > Spec: specs/planning-artifacts/epics.md#story-7-4
### Telemetry & Admin/Ops Console
> Goal: Run the venture on real numbers.

- [ ] Story 8.1: Session-health telemetry pipeline
  > As an operator
  > I want session-health metrics captured to an analytics store
  > So that I can monitor the product's real-time health.
  > AC: Given active sessions, When events are emitted, Then simultaneous-start accuracy, drift, voice latency, continuity, and failures flow via Firehose → S3 → Athena (FR43, AR7), And live metrics publish to CloudWatch with alarms on p95 breaches, And no PII/voice/precise-location is included in telemetry (NFR6/8/9).
  > Spec: specs/planning-artifacts/epics.md#story-8-1
- [ ] Story 8.2: "Felt-together" aggregation
  > As an operator
  > I want the "felt together?" responses aggregated
  > So that I can track the product's truest health metric.
  > AC: Given captured feedback responses (FR42 capture), When aggregation runs, Then the felt-together rate is computed over sessions and time windows (FR42 aggregation), And it is queryable for the admin dashboard.
  > Spec: specs/planning-artifacts/epics.md#story-8-2
- [ ] Story 8.3: Admin console auth & shell
  > As founder/Maria
  > I want a secure admin web console
  > So that only authorized operators access ops tools.
  > AC: Given the `apps/admin` web app, When I sign in, Then access is restricted to the `admin` Cognito group via RBAC (NFR11), And the console shell provides navigation to dashboards, billing, and accounts.
  > Spec: specs/planning-artifacts/epics.md#story-8-3
- [ ] Story 8.4: Metrics dashboards
  > As founder/Maria
  > I want dashboards of the venture's key metrics
  > So that I make decisions on data, not vibes.
  > AC: Given the telemetry pipeline and aggregations, When I open the dashboard, Then I see felt-together rate, simultaneous-start/drift/voice-latency distributions, paired 4-week retention, active pairs, and Premium-funnel drop-off (FR44), And data is filterable by time range.
  > Spec: specs/planning-artifacts/epics.md#story-8-4
- [ ] Story 8.5: Billing administration
  > As founder/Maria
  > I want to manage subscriptions, refunds, and disputes
  > So that I can run billing operations.
  > AC: Given the admin billing console, When I view a customer, Then I can see and manage subscriptions, transactions, refunds, and failed/disputed payments (FR45, FR46), And actions are logged.
  > Spec: specs/planning-artifacts/epics.md#story-8-5
- [ ] Story 8.6: Revenue reporting
  > As founder/Maria
  > I want revenue and payment reporting
  > So that I can track the path to two salaries.
  > AC: Given billing data, When I open revenue reporting, Then I see MRR, churn, and failed-payment rate (FR47), And figures reconcile with Stripe.
  > Spec: specs/planning-artifacts/epics.md#story-8-6
- [ ] Story 8.7: User account administration
  > As founder/Maria
  > I want to manage user accounts for billing and safety actions
  > So that I can resolve issues and enforce policy.
  > AC: Given the admin console, When I act on a user account, Then I can suspend, reinstate, and resolve disputes in support of billing and trust-&-safety (FR48), And every action is auditable.
  > Spec: specs/planning-artifacts/epics.md#story-8-7

## Completed

## Notes
- Follow TDD methodology (red-green-refactor)
- One story per Ralph loop iteration
- Update this file after completing each story
