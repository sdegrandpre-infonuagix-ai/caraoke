// Drift detection & correction math (Story 4.5, FR19/FR20/NFR2).
// Pure and deterministic — no I/O, fully unit-testable.
// The hook (useDriftCorrection) feeds live values; the logic here decides what to do.

/** Drift < this threshold (ms) is acceptable — no correction needed (NFR2: ≤50ms). */
export const DRIFT_THRESHOLD_MS = 50;

/**
 * How often (ms) we sample and broadcast our playback position.
 * 2s balances bandwidth vs. responsiveness; Spotify state changes aren't instant.
 */
export const SAMPLE_INTERVAL_MS = 2_000;

/**
 * Maximum correction size (ms): a single seek of more than this indicates something else
 * went wrong (e.g. one device is on the wrong track). Clamp to avoid wild jumps.
 */
export const MAX_CORRECTION_MS = 5_000;

export interface PositionSample {
  /** Estimated playback position on this device (ms since track start). */
  positionMs: number;
  /** Server-time epoch (ms) when this sample was taken, for latency compensation. */
  sampledAtServerMs: number;
}

export interface DriftResult {
  /** Our position minus the partner's latency-compensated position. Negative = we're behind. */
  driftMs: number;
  /** True when |driftMs| > DRIFT_THRESHOLD_MS and a correction should be applied. */
  needsCorrection: boolean;
  /** Target position to seek to (only meaningful when needsCorrection is true). */
  correctionTargetMs: number;
}

/**
 * Compute latency-compensated drift between us and our partner.
 *
 * @param ourPositionMs   Our current estimated playback position (ms).
 * @param partner         Partner's position report (from the data channel).
 * @param nowServerMs     Server-time estimate at the moment of this call.
 */
export function computeDrift(
  ourPositionMs: number,
  partner: PositionSample,
  nowServerMs: number,
): DriftResult {
  // Account for the time that elapsed since the partner sampled their position.
  const partnerAge = Math.max(0, nowServerMs - partner.sampledAtServerMs);
  const partnerCurrentMs = partner.positionMs + partnerAge;

  const driftMs = ourPositionMs - partnerCurrentMs;
  // Only the lagging device corrects itself; the leading device does nothing —
  // its partner will independently catch up. Negative drift = we are behind.
  const needsCorrection = driftMs < -DRIFT_THRESHOLD_MS && Math.abs(driftMs) <= MAX_CORRECTION_MS;

  // Always seek to the partner's current position — the lagging device catches up,
  // the leading device waits naturally (no active correction for the leader).
  const correctionTargetMs = Math.max(0, partnerCurrentMs);

  return { driftMs, needsCorrection, correctionTargetMs };
}

/**
 * Estimate our current playback position given when the track started.
 * Uses a server-time epoch to avoid local clock drift between devices.
 *
 * @param playStartServerMs  Server-epoch ms when playback began (from `playback.scheduled`).
 * @param nowServerMs        Current server-time estimate (from clockSync.serverNow()).
 */
export function estimatePosition(playStartServerMs: number, nowServerMs: number): number {
  return Math.max(0, nowServerMs - playStartServerMs);
}

/**
 * Compute drift between the real sampled Spotify position and the expected position
 * on the shared scheduled timeline (T + elapsed).
 *
 * This is the corrected drift function for Story 9.4: the input `realPositionMs` MUST come
 * from the actual Spotify client (via the backend polling endpoint), never from estimatePosition().
 * Comparing against the schedule keeps both devices aligned to the same absolute timeline even
 * when one device's Spotify client buffers or starts slightly late.
 *
 * @param realPositionMs    Real playback position sampled from the Spotify client (ms).
 * @param playStartServerMs Server-epoch ms when playback was scheduled to begin (T).
 * @param nowServerMs       Current server-time estimate (from clockSync.serverNow()).
 */
export function computeScheduleDrift(
  realPositionMs: number,
  playStartServerMs: number,
  nowServerMs: number,
): DriftResult {
  const expectedPositionMs = estimatePosition(playStartServerMs, nowServerMs);
  const driftMs = realPositionMs - expectedPositionMs;
  const needsCorrection = driftMs < -DRIFT_THRESHOLD_MS && Math.abs(driftMs) <= MAX_CORRECTION_MS;
  const correctionTargetMs = Math.max(0, expectedPositionMs);
  return { driftMs, needsCorrection, correctionTargetMs };
}

/** Encode a PositionSample to a compact UTF-8 JSON payload for the LiveKit data channel. */
export function encodePositionMsg(sample: PositionSample): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ t: 'pos', p: sample.positionMs, s: sample.sampledAtServerMs }));
}

/** Decode a LiveKit data payload back to a PositionSample. Returns null on parse failure. */
export function decodePositionMsg(bytes: Uint8Array): PositionSample | null {
  try {
    const obj = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (obj['t'] !== 'pos' || typeof obj['p'] !== 'number' || typeof obj['s'] !== 'number') return null;
    return { positionMs: obj['p'], sampledAtServerMs: obj['s'] };
  } catch {
    return null;
  }
}
