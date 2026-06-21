> # ⚠️ DEPRECATED — DO NOT USE
> This architecture describes an **earlier, superseded** model: a backend "Sync Coordinator" distributing a shared playback timeline (peer-to-peer-style 100ms playback sync) with on-device scoring. The authoritative PRD at [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) replaces this with **voice-only sync over independent simultaneous Spotify playback** (each device plays its own Premium stream; only live voice is transmitted), an **xAI Voice Agent** control plane, and **AWS edge-first** media relays. The new architecture must be designed from that PRD.
>
> **Do not use this file for technical design or implementation.** Retained for historical reference only. — *Deprecated 2026-06-21*

---

# Caraoke High-Level Architecture

## Overview
Caraoke is a mobile app with a mobile client and backend service. The mobile client handles pairing, playback sync, audio capture, lyrics display, and scoring. The backend service handles session coordination, user pairing, song metadata, and connection state.

## Components
- Mobile Client (iOS/Android)
  - Session Manager: creates and joins duet sessions, exchanges pairing codes, and handles reconnection.
  - Audio Sync Engine: synchronizes playback state and ensures time-aligned song playback across devices.
  - Lyrics Renderer: displays real-time lyrics and timing cues with low-latency updates.
  - Microphone Manager: requests permission and captures voice input securely.
  - UI Layer: pairing, song selection, playback controls, scoring, and audio settings.

- Backend Service
  - Session API: creates session IDs, validates pairing codes, and maintains session state.
  - Sync Coordinator: distributes playback timestamps and sync anchors to paired devices.
  - Song Catalog Service: provides song metadata, lyrics, and scoring parameters.
  - Connection Monitor: tracks connection health, reconnection attempts, and session continuity.

## Data Flow
1. User A creates a duet session and receives a pairing code or invite link.
2. User B enters the code or opens the link.
3. Both clients connect to the backend session API and exchange sync anchors.
4. The backend distributes the same song metadata and playback timeline to both clients.
5. Clients begin playback and exchange periodic synchronization updates.
6. Clients capture microphone input and optionally perform local scoring.

## Technologies
- Mobile: cross-platform framework or native Swift/Kotlin with low-latency audio support.
- Backend: REST API with WebSocket or real-time signaling for sync updates.
- Networking: TLS 1.2+ for all client/server communication.
- Data: session state in a lightweight datastore suitable for 50+ concurrent sessions.

## Non-Functional Considerations
- Latency: maintain audio sync within 100ms with periodic correction.
- Privacy: microphone access requested explicitly and audio signaling encrypted.
- Scalability: support 50 concurrent paired sessions in MVP and scale via horizontal backend instances.
- Reliability: reconnect dropped devices within 60 seconds if the session remains valid.
