// ⚠️ THROWAWAY — Phase 0 validation harness (Story 1.3). Not production code.
//
// Shared signaling/coordination protocol used by BOTH the coordinator server and the
// two-phone app. Voice flows peer-to-peer over WebRTC; the backing track does NOT — each
// phone plays its OWN Spotify stream, triggered by an absolute start timestamp (NFR21).

/** Logical roles in a 2-phone session. The operator triggers the countdown start. */
export type Role = 'operator' | 'partner';

/** Messages a client sends to the coordinator. */
export type ClientMessage =
  | { type: 'join'; roomId: string; role: Role }
  // Clock-offset probe: client stamps t0, server echoes its time (see simultaneousStart.ts).
  | { type: 'ping'; t0: number }
  // WebRTC signaling relayed verbatim to the other peer (voice only).
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: unknown }
  // Operator presses "start": coordinator schedules a simultaneous start for both phones.
  | { type: 'start'; trackUri: string; prerollMs?: number };

/** Messages the coordinator sends to clients. */
export type ServerMessage =
  | { type: 'joined'; roomId: string; role: Role; peers: number }
  | { type: 'peer-joined'; peers: number }
  | { type: 'peer-left'; peers: number }
  | { type: 'pong'; t0: number; serverTime: number }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: unknown }
  // Both phones begin `trackUri` at absolute epoch `startAt` (coordinator wall-clock).
  | { type: 'scheduled-start'; trackUri: string; startAt: number }
  | { type: 'error'; message: string };

export const DEFAULT_PREROLL_MS = 3000;
