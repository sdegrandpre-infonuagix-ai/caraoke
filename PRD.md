> # ⚠️ DEPRECATED — DO NOT USE
> This document describes an **earlier, superseded** product model (peer-to-peer playback sync with on-device scoring/lyrics as core). It has been **replaced** by the authoritative PRD at [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md), which uses a **voice-only-sync + simultaneous-independent-playback** architecture and demotes scoring to an optional Growth feature.
>
> **Do not use this file for UX, architecture, epics, or implementation.** Retained for historical reference only. — *Deprecated 2026-06-21*

---
## 1. Executive Summarys
Caraoke is a mobile app that enables two people in separate cars to sing the same song together in real time. It delivers synchronized playback, low-latency audio sharing, and on-screen scoring for paired users to match lyrics and rhythm while maintaining privacy and connection across distance.

## 2. Success Criteria
- Achieve synchronized audio playback within 100ms between paired devices for 95% of sessions as measured by end-to-end latency testing.
- Enable two users to establish a shared song session in under 30 seconds as measured by timed onboarding flows.
- Maintain a session continuity rate of 90% or higher for connections lasting at least one full song as measured by production session logs.
- Deliver song lyrics and timing cues with visual updates under 200ms as measured by app performance instrumentation.
- Support at least 50 concurrent paired sessions on target backend infrastructure as measured by load testing.

## 3. Product Scope
MVP:
- Pair two mobile devices into a shared singing session.
- Synchronize playback of the same song across both devices.
- Display lyrics and basic scoring feedback for the active singer.
- Allow voice capture from each user and optional volume balance control.

Growth:
- Add song selection and queue management for paired sessions.
- Introduce session invitations via link or QR code.
- Add social sharing of scores and session history.
- Support offline caching of song metadata and lyrics.

Vision:
- Enable a mobile karaoke experience for friends in separate vehicles with real-time duet modes, themed challenges, and group session support.
- Integrate with streaming services and in-car audio systems for seamless ride-based karaoke.

Out of scope:
- Multi-user sessions beyond two active cars in the MVP.
- Native integration with automotive infotainment platforms.
- Full music licensing and store publishing within the first release.

## 4. User Journeys
| Journey | Steps | Acceptance Criteria |
|---|---|---|
| Start a duet session | 1. Open app 2. Create session 3. Invite partner 4. Confirm pairing 5. Start song | Users can pair within 30s and begin playback without manual sync.
| Choose song and sing | 1. Select song 2. Load lyrics 3. Start singing 4. See score updates | Lyrics appear before or at start, <200ms update latency, score displayed after each phrase.
| Maintain connection | 1. Sing full song 2. Monitor sync status 3. Continue or exit | Session persists for one song with at least 90% continuity rate.
| Adjust audio settings | 1. Open audio controls 2. Change balance or volume 3. Confirm change | Audio adjustments apply immediately and persist for session.

## 5. Domain Requirements
Domain: Mobile App / Entertainment
- The app must conform to mobile platform guidelines for background audio playback on iOS and Android.
- The app must not capture or transmit unnecessary personal data beyond session pairing identifiers.
- The app must provide clear user consent before enabling microphone access.
- The app must encrypt audio signaling traffic using TLS 1.2+ for all server communications.

## 6. Innovation Analysis
- Real-time duet sync across separate cars differentiates Caraoke from single-device karaoke apps.
- Pairing two devices into a shared playback session with scoring creates a social, location-independent experience.
- Low-latency synchronization and in-app session persistence enable more expressive remote singing sessions than standard voice chat.

## 7. Project-Type Requirements
Project type: Mobile App
- Support iOS and Android native or cross-platform mobile deployment.
- Use push- or local notifications only for session invitations and connection status updates.
- Support microphone permission flow and runtime audio capture consent.
- Ensure playback control and audio focus management follow OS conventions.

## 8. Functional Requirements (FRs)
| ID | Requirement | Test Criteria |
|---|---|---|
| FR-1 | Users can create a shared duet session and generate an invite link or pairing code. | Create session and receive a valid pairing code within 30s. |
| FR-2 | Users can join an existing duet session using a valid pairing code or link. | Joining completes in under 30s and displays the paired partner. |
| FR-3 | The app can synchronize song playback state between two devices within 100ms. | Measured playback offset ≤100ms in 95% of paired sessions. |
| FR-4 | The app displays scrolling lyrics and timing cues for the current song. | Lyrics appear and update with <200ms latency. |
| FR-5 | The app captures microphone input from each user during the session. | Microphone input is enabled only after explicit consent and can be recorded. |
| FR-6 | The app provides a score or feedback indicator based on singing timing. | Score appears within 1s after phrase completion. |
| FR-7 | The app allows users to adjust the relative volume or balance of each singer. | Audio control changes apply immediately and persist for the session. |
| FR-8 | The app reconnects a disconnected user automatically if the link is still valid. | Reconnection succeeds within 60s and restores playback state. |

## 9. Non-Functional Requirements (NFRs)
- The system shall maintain an end-to-end session latency under 100ms for 95th percentile of synchronized playback events as measured by latency logs.
- The system shall complete session pairing within 30 seconds as measured by timed onboarding tests.
- The system shall sustain 50 concurrent paired mobile sessions as measured by load testing of the backend service.
- The system shall encrypt all network signaling traffic with TLS 1.2 or higher as verified by transport security scans.
- The system shall display lyrics and timing cues in under 200ms from playback state change as measured by client-side instrumentation.
