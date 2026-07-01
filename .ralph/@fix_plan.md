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

## Completed

## Notes
- Follow TDD methodology (red-green-refactor)
- One story per Ralph loop iteration
- Update this file after completing each story
