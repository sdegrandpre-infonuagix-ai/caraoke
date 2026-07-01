// Pure reconnect-logic primitives (Story 4.8, FR15/FR25/FR26).
// All functions are side-effect-free for unit testing without native modules.

/** NFR15 / FR15: continuity window — auto-reconnect for up to this many ms. */
export const CONTINUITY_WINDOW_MS = 60_000;

/** Exponential-backoff cap (ms). After 3 attempts the delay plateaus here. */
export const MAX_BACKOFF_MS = 8_000;

// ── Riff voice messages (UX-DR8: warm, never technical) ──────────────────────

export const RIFF_RECONNECTING =
  "Hold on, reconnecting...";

export const RIFF_RECONNECTED =
  "We're back. Keep singing.";

/** FR26: graceful end by voice with a warm next step. */
export const RIFF_GIVE_UP =
  "Looks like we lost the connection. That was beautiful — let's pick it up again soon.";

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true when the continuity window has been exhausted and the session
 * should end gracefully rather than keep trying.
 */
export function shouldGiveUp(startMs: number, nowMs: number): boolean {
  return nowMs - startMs >= CONTINUITY_WINDOW_MS;
}

/**
 * Exponential backoff delay for retry attempt N (0-indexed), capped at MAX_BACKOFF_MS.
 * attempt 0 → 1 s, 1 → 2 s, 2 → 4 s, 3+ → 8 s.
 */
export function backoffDelayMs(attempt: number): number {
  return Math.min(1_000 * Math.pow(2, attempt), MAX_BACKOFF_MS);
}
