// ⚠️ THROWAWAY — Phase 0 harness (Story 1.3). Pure clock/scheduling math (no I/O), so it
// is unit-testable without phones. A proper clock-sync primitive arrives in Story 3.6.

/** A single ping/pong round-trip sample used to estimate the server-time offset. */
export interface ClockSample {
  /** Client time when the ping was sent. */
  t0: number;
  /** Server time reported in the pong. */
  serverTime: number;
  /** Client time when the pong was received. */
  t1: number;
}

/**
 * Estimate the offset to add to the LOCAL clock to approximate the coordinator's clock,
 * assuming a symmetric round-trip: serverTime ≈ t0 + rtt/2 + offset.
 *   offset = serverTime - (t0 + rtt/2)
 */
export function estimateOffsetMs(sample: ClockSample): number {
  const rtt = sample.t1 - sample.t0;
  return sample.serverTime - (sample.t0 + rtt / 2);
}

/** Median offset across several samples — robust to occasional cellular latency spikes. */
export function medianOffsetMs(samples: ClockSample[]): number {
  if (samples.length === 0) return 0;
  const offsets = samples.map(estimateOffsetMs).sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  return offsets.length % 2 === 0 ? (offsets[mid - 1]! + offsets[mid]!) / 2 : offsets[mid]!;
}

/** Coordinator-side: the absolute start time both phones aim for. */
export function computeStartAt(serverNow: number, prerollMs: number): number {
  return serverNow + prerollMs;
}

/**
 * Client-side: milliseconds to wait (on the LOCAL clock) before triggering playback so it
 * lands on the shared `startAt` (which is in coordinator time). Never negative.
 */
export function msUntilStart(startAt: number, localNow: number, offsetMs: number): number {
  const localTarget = startAt - offsetMs;
  return Math.max(0, localTarget - localNow);
}
