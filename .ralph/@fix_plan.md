# Ralph Fix Plan

## Stories to Implement

### Foundation & the Magic Moment (Phase 0)
> Goal: Scaffold the monorepo and base infra, then prove the duet *feels* real on a Montreal highway before committing to the full build.

- [x] Story 1.1: Monorepo & Expo app scaffold
- [x] Story 1.2: Base AWS infrastructure skeleton (Terraform)
- [x] Story 1.3: Phase 0 duet harness (manual two-phone prototype)
- [x] Story 1.4: Phase 0 measurement & go/no-go report
- [x] Story 1.5: Deploy self-hosted LiveKit SFU
- [x] Story 1.6: Deploy Spotify MCP server
### Accounts, Profile & Localization
> Goal: Users onboard, link Premium, set language, and control their account.

- [x] Story 2.1: Design tokens & foundation primitives
- [x] Story 2.2: Sign in with Apple/Google (Cognito)
- [x] Story 2.3: Profile management & account deletion
- [x] Story 2.4: Connect & verify Spotify Premium
- [x] Story 2.5: Language preference & i18n foundation
### Pairing & Partner Connection
> Goal: Two users connect and reach the ready state, hands-free-ready.

- [x] Story 3.1: Create session & generate invite
- [x] Story 3.2: Join session via invite
- [x] Story 3.3: Save partners & fast re-pair
- [x] Story 3.4: Ready-handshake
- [x] Story 3.5: Push notifications (invites, ready, reconnect)
- [x] Story 3.6: Clock-sync primitive
### The Duet (real-time singing loop)
> Goal: The product: two people sing together, hands-free, across distance.

- [x] Story 4.1: Native audio module & LiveKit live voice
- [x] Story 4.2: SessionStateMachine & sonic services
- [x] Story 4.3: Voice-Agent intent & song request
- [x] Story 4.4: Simultaneous scheduled start
- [x] Story 4.5: Drift monitoring & correction
- [x] Story 4.6: Voice playback controls
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
