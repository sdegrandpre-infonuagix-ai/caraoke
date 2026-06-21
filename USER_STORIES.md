> # ⚠️ DEPRECATED — DO NOT USE
> These user stories reflect an **earlier, superseded** product model (peer-to-peer playback sync, on-device scoring/lyrics as core). They have been **replaced** by the authoritative PRD at [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md). Epics and stories should be regenerated from that PRD's Functional Requirements (FR1–FR48), not from this file.
>
> **Do not use this file for sprint planning or implementation.** Retained for historical reference only. — *Deprecated 2026-06-21*

---

# Caraoke User Stories

## Epic: Session Pairing
- As a user, I want to create a duet session so I can sing with someone in another car.
  - Acceptance: The app displays a pairing code or invite link within 30 seconds.
- As a user, I want to join a duet session with a partner code or link so I can connect quickly.
  - Acceptance: The app pairs both devices and confirms the partner within 30 seconds.
- As a user, I want to reconnect automatically if my connection drops so I can continue singing without restarting.
  - Acceptance: The app reconnects the lost device within 60 seconds if the session is still valid.

## Epic: Synchronized Playback
- As a user, I want both devices to play the same song in sync so we sing together.
  - Acceptance: Playback offset is ≤100ms for 95% of sessions.
- As a user, I want the song lyrics and timing cues to update live as the song plays so I can follow the performance.
  - Acceptance: Lyrics and cues refresh within 200ms of playback state change.

## Epic: Audio and Scoring
- As a user, I want the app to capture my microphone input only after I grant permission so I control privacy.
  - Acceptance: Microphone access is requested before capture and only enabled after consent.
- As a user, I want audio balance controls so I can adjust how I hear my own voice and the partners voice.
  - Acceptance: Adjustments apply immediately and persist for the session.
- As a user, I want a score or feedback indicator so I know how well I am singing relative to the song.
  - Acceptance: Feedback displays within 1 second after each phrase completes.

## Epic: Song Selection and Control
- As a user, I want to select a song from a library before starting a session so we can choose what to sing.
  - Acceptance: The app presents available songs and allows selection before playback.
- As a user, I want to start, pause, and stop playback from the app so I can control the performance.
  - Acceptance: Playback controls respond immediately and update both devices.

## Epic: Mobile Experience
- As a user, I want the app to request microphone permission using native platform dialogs so I understand what is being shared.
  - Acceptance: The native permission prompt is shown before microphone access.
- As a user, I want the app to continue audio session handling properly when the app is in the foreground so my singing session is stable.
  - Acceptance: The session remains active while the app is foregrounded and does not lose audio focus unexpectedly.
