# ⚠️ Phase 0 Duet Harness — THROWAWAY

> **This is a throwaway validation prototype, not production code.** It exists solely to
> answer the Phase 0 go/no-go question (PRD AR2): _does a real two-phone duet feel together
> on a Montreal highway?_ It is deliberately **not** part of the pnpm workspace, uses no
> Caraoke backend, no xAI agent, and no LiveKit — those are the real product (Epics 2–8).
> Delete this directory once Phase 0 concludes.

## What it proves (Story 1.3)

Two phones on cellular, each with **Spotify Premium**:

1. Both join the same room on a tiny coordinator (`server/`).
2. They open a **full-duplex, voice-only WebRTC** channel (`app/src/lib/voicePeer.ts`).
3. The **operator** presses _Start countdown_; the coordinator schedules one absolute
   start time and sends it to both phones.
4. Each phone begins **its own** Spotify stream at that instant
   (`app/src/lib/spotifyClient.ts`).

### NFR21 — the song is never sent peer-to-peer

The backing track is **never** captured or transmitted over WebRTC. The only media added to
the peer connection is the **microphone** (see the invariant comment in `voicePeer.ts`).
Each phone plays the song directly from Spotify. The WebRTC channel carries **voice only**.

## Architecture

```
tools/phase0-harness/
├── protocol.ts          # shared signaling/coordination message types
├── server/index.ts      # ws coordinator: pair phones, relay SDP/ICE, schedule start
├── app/                 # throwaway Expo (dev-client) two-phone client
│   ├── index.tsx        # operator/partner screen (connect, countdown, status)
│   └── src/lib/
│       ├── signalingClient.ts     # typed WebSocket client
│       ├── voicePeer.ts           # VOICE-ONLY WebRTC peer (NFR21 invariant)
│       ├── spotifyClient.ts       # this phone's own Spotify Web API playback
│       └── simultaneousStart.ts   # clock-offset + start-scheduling math (unit-tested)
└── results/             # Story 1.4 drift/latency logs + "felt-together?" answers
```

## Field protocol (Bell 5G, Montreal highway)

1. On a laptop tethered to the operator's phone (or any reachable host), start the
   coordinator: `pnpm --dir tools/phase0-harness server` (defaults to `ws://0.0.0.0:8787`).
2. Build a **dev client** for each phone (`react-native-webrtc` needs custom native code —
   Expo Go will not work): `pnpm --dir tools/phase0-harness ios` / `android`.
3. On each phone: set the coordinator URL + the same room, paste a fresh **Spotify Premium**
   access token and the same track URI, then **Connect**. Set one phone's role to
   `operator`, the other to `partner`.
4. Confirm voice is two-way, then the operator presses **Start countdown**.
5. Drive. (Story 1.4 adds drift/latency sampling and the spoken "felt together?" capture.)

## Run the unit tests

The clock/scheduling math is pure and testable without phones:

```bash
pnpm --dir tools/phase0-harness test
# or directly:
node --import tsx --test app/src/lib/simultaneousStart.test.ts
```

## Install (throwaway — kept out of the root workspace)

```bash
cd tools/phase0-harness
npm install        # or pnpm install --ignore-workspace
```
