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
- [x] Story 4.7: Eyes-free driving mode & session screen
- [x] Story 4.8: Voice-first errors, reconnect & resync
- [x] Story 4.9: Post-session "felt together?" capture
- [x] Story 4.10: Sonic verification harness
- [x] Story 4.11: CaraokeAudio native module — iOS (Swift)
- [x] Story 4.12: CaraokeAudio native module — Android (Kotlin)
### Nearby Discovery
> Goal: Spontaneous duets with nearby strangers — safe by construction.

- [x] Story 5.1: Opt-in discoverability toggle
- [x] Story 5.2: Age verification (18+) via Stripe Identity
- [x] Story 5.3: Coarse-location publishing (Plus Codes)
- [x] Story 5.4: Voice read-out of nearby singers
- [x] Story 5.5: Add nearby partner & go-dark
### Trust, Safety & Privacy
> Goal: Users are safe, in control, and protected.

- [x] Story 6.1: Mute, block & report
- [x] Story 6.2: Rapid voice-disconnect
- [x] Story 6.3: Independent permission management
- [x] Story 6.4: Data controls & transparency
- [x] Story 6.5: Abuse-handling pipeline
### Billing & Subscriptions
> Goal: The monetization rail — pay to sing.

- [x] Story 7.1: Stripe subscription & payment method
- [x] Story 7.2: Plan management
- [x] Story 7.3: Billing history & receipts
- [x] Story 7.4: Stripe webhook handling
### Telemetry & Admin/Ops Console
> Goal: Run the venture on real numbers.

- [x] Story 8.1: Session-health telemetry pipeline
- [x] Story 8.2: "Felt-together" aggregation
- [x] Story 8.3: Admin console auth & shell
- [x] Story 8.4: Metrics dashboards
- [x] Story 8.5: Billing administration
- [x] Story 8.6: Revenue reporting
- [x] Story 8.7: User account administration

### Real-Time Duet Rework (Epic 9 — makes the duet loop actually run end-to-end)
> Goal: Epic 4 is code-complete but NOT wired end-to-end — two code reviews found the core
> duet loop cannot currently run a real session. These stories close that gap. Highest priority:
> without them the product's central promise (two cars, one song, in sync) does not function.
> Each story is TDD (red-green-refactor); land failing tests that describe the wired behavior first.

- [x] Story 9.1: Server-side Voice-Agent module (`/agent`)
      Defect: there is no backend `/agent` module. The Voice-Agent song-request flow (Story 4.3)
      has no server endpoint to coordinate a duet, so nothing ever initiates a synchronized start.
      Build a `services/api/src/modules/agent` module: accept a song request for a session (caller
      must be a participant — reuse PairingService.assertParticipant), resolve the track via the
      Spotify integration, and hand off to the scheduled-start producer (9.2). Uniform {data,error}
      envelope, Zod validation, AppError codes. Wire into app.ts.

- [x] Story 9.2: `playback.scheduled` event producer & scheduled-start wiring
      Defect: the mobile useScheduledStart hook consumes a `playback.scheduled` event that NOTHING
      on the server produces — so the "start at T" instruction is never sent and both phones wait
      forever. Produce `playback.scheduled` (start timestamp T derived from the clock-sync offset,
      NFR1 ≤200ms) from the agent/session flow via the existing event publisher (AppSync Events),
      addressed to both participants. Add a producer-side test asserting the event shape and that T
      is far enough in the future for both clients to prebuffer.

- [x] Story 9.3: SessionStateMachine wiring to the real event stream
      Defect: SessionStateMachine (Story 4.2) is instantiated but stays at `idle` — no code
      transitions it in response to real events. Wire: ready-handshake → `ready`;
      `playback.scheduled` received → `playing`; drift/disconnect → `reconnecting`; session end →
      `ended`. Cover each transition (and illegal-transition rejection) with tests.

- [x] Story 9.4: Drift-correction redesign (measure real playback position)
      Defect: drift correction (Story 4.5) is broken by construction — it never samples the actual
      Spotify playback position, so the computed drift is meaningless and no correct nudge can be
      applied. Redesign to sample the real local playback position (via the Spotify SDK / native
      module), compare against the shared scheduled timeline (T + elapsed), and correct toward
      NFR2 ≤50ms. Tests must drive the correction math from sampled positions, not from a stub.

- [x] Story 9.5: Native onSpeechEnded wiring (TTS → playback sequencing)
      Defect: the TTS "speech finished" callback is never wired, so the app cannot sequence
      "agent finished speaking" → "start playback". Wire AVSpeechSynthesizerDelegate
      (didFinish utterance) on iOS and UtteranceProgressListener (onDone) on Android through the
      NativeSonicModule bridge to a JS `onSpeechEnded` event.

- [x] Story 9.6: Native audio robustness (async load, un-duck, re-duck)
      Defects from review of Stories 4.11/4.12: (a) Android SoundPool plays before the sample is
      loaded — gate playback on the load-complete callback; (b) Android never abandons audio focus,
      so other apps stay ducked after a session — abandon focus on stop/teardown; (c) iOS
      restore-ramp isn't cancelled when a new duck arrives mid-ramp, causing a volume fight — cancel
      the in-flight ramp on re-duck.

- [ ] Story 9.7: Scheduled-start prebuffer leak & markReady transaction
      Defects: (a) useScheduledStart leaks its prebuffer/timer if the component unmounts before T —
      clean up on unmount/abort; (b) markReady (ready-handshake) updates readiness without a
      transaction, so two near-simultaneous ready calls can race the "both ready" check — wrap the
      read-modify-write in a DB transaction (or atomic update) and test the concurrent case.

## Completed

## Notes
- Follow TDD methodology (red-green-refactor)
- One story per Ralph loop iteration
- Update this file after completing each story
- Epic 9 (Real-Time Duet Rework) is the top priority: it is what makes the core product function.
  Backend authz/billing review fixes were applied directly on branch fix/review-backend-security
  (commits 6bd1d33, 02de0e5) — do NOT re-implement those; focus Ralph on Epic 9.
