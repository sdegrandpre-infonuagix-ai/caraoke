// Pure motion-detection primitives (Story 4.7, FR17/UX-DR5).
// All functions are side-effect-free so they can be unit-tested without native modules.
// The hook (useMotionDetection) wraps these with expo-sensors Accelerometer data.

/** Rolling-window size (samples). At 5 Hz this is 3 seconds of data. */
export const SAMPLE_WINDOW = 15;

/**
 * Variance threshold (m²/s⁴) that separates vehicle motion from stationary.
 * A parked phone has near-zero magnitude variance; a moving vehicle produces
 * road vibration + acceleration changes that push variance well above this.
 */
export const MOTION_VARIANCE_THRESHOLD = 0.3;

/** Must detect driving for this many ms before confirming (stationary → driving). */
export const DRIVE_DEBOUNCE_MS = 3_000;

/**
 * Must detect stationary for this many ms before confirming (driving → stationary).
 * Longer than DRIVE_DEBOUNCE_MS to survive red-light stops without flickering.
 */
export const STOP_DEBOUNCE_MS = 5_000;

/** Compute the magnitude of a 3-axis accelerometer sample (m/s²). */
export function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/** Population variance of a numeric array. Returns 0 for empty or single-element arrays. */
export function variance(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
}

/**
 * Classify a rolling window of magnitude samples.
 * High variance = vehicle in motion; low variance = stationary.
 */
export function classifyMotion(magnitudes: number[]): 'driving' | 'stationary' {
  return variance(magnitudes) >= MOTION_VARIANCE_THRESHOLD ? 'driving' : 'stationary';
}

export interface DebounceState {
  /** The externally-visible, confirmed state. */
  confirmed: 'driving' | 'stationary';
  /** The raw reading we're waiting to debounce into confirmed. */
  pending: 'driving' | 'stationary';
  /** Accumulated ms spent in the current pending state. */
  pendingMs: number;
}

export function initDebounce(): DebounceState {
  return { confirmed: 'stationary', pending: 'stationary', pendingMs: 0 };
}

/**
 * Advance the debounce state machine by one tick.
 *
 * - If `raw` matches `pending`, accumulate `deltaMs`. Once accumulated time crosses the
 *   threshold for that direction, promote `pending` → `confirmed`.
 * - If `raw` differs from `pending`, reset the counter and track the new pending state
 *   without changing `confirmed` yet.
 */
export function advanceDebounce(
  state: DebounceState,
  raw: 'driving' | 'stationary',
  deltaMs: number,
): DebounceState {
  if (raw !== state.pending) {
    // Direction changed — start counting toward the new state but don't confirm yet.
    return { confirmed: state.confirmed, pending: raw, pendingMs: deltaMs };
  }

  const pendingMs = state.pendingMs + deltaMs;
  const threshold = raw === 'driving' ? DRIVE_DEBOUNCE_MS : STOP_DEBOUNCE_MS;

  if (pendingMs >= threshold) {
    return { confirmed: raw, pending: raw, pendingMs };
  }

  return { ...state, pendingMs };
}
