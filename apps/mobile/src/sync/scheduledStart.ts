// Simultaneous scheduled-start math (Story 4.4, FR14/FR18/NFR1).
// All pure functions — no side-effects, fully unit-testable without a device.
// The hook (useScheduledStart) drives these with the live clockSync offset.

/** Minimum local delay (ms) accepted for scheduling — avoid firing in the past. */
export const MIN_SCHEDULE_MS = 0;

/** Pre-roll window (ms): extra time given to Spotify to pre-buffer the track. */
export const PRE_ROLL_MS = 2_000;

/**
 * Compute the local delay (ms) until an absolute server-epoch start time.
 * Returns 0 if T is already in the past (fire immediately, best effort).
 * `localNow` and `clockOffsetMs` are injected so the function is deterministic.
 */
export function localDelayMs(startAtServerMs: number, localNow: number, clockOffsetMs: number): number {
  const correctedNow = localNow + clockOffsetMs;
  return Math.max(MIN_SCHEDULE_MS, startAtServerMs - correctedNow);
}

/**
 * True if the start time is far enough in the future that a pre-buffer pass is worth attempting.
 * Below `PRE_ROLL_MS`, skip the pre-buffer and go straight to play.
 */
export function hasPrebufferWindow(startAtServerMs: number, localNow: number, clockOffsetMs: number): boolean {
  return localDelayMs(startAtServerMs, localNow, clockOffsetMs) >= PRE_ROLL_MS;
}

/**
 * Given an absolute server-time `startAt`, return the absolute server-time at which the
 * pre-buffer command should be sent (startAt minus the pre-roll buffer, clamped to now).
 */
export function prebufferServerMs(startAtServerMs: number): number {
  return startAtServerMs - PRE_ROLL_MS;
}
