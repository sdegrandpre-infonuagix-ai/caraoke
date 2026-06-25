// Clock-sync primitive (Story 3.6, AR10/NFR1). Pure math for estimating a client's offset to
// server time from ping/pong round-trips, so a simultaneous start can be scheduled to ≤200ms.
// NTP-style: the sample with the smallest round-trip gives the most accurate offset.

/** One ping/pong round-trip: client sends at t0, server reports serverTime, client gets pong at t1. */
export interface ClockSample {
  t0: number;
  serverTime: number;
  t1: number;
}

/** Round-trip time for a sample (ms). */
export function roundTripMs(s: ClockSample): number {
  return s.t1 - s.t0;
}

/**
 * Offset to ADD to the local clock to approximate server time, assuming a symmetric trip:
 *   serverNow ≈ localNow + offset, where offset = serverTime - (t0 + rtt/2).
 */
export function estimateOffsetMs(s: ClockSample): number {
  return s.serverTime - (s.t0 + roundTripMs(s) / 2);
}

/** Median offset across samples — robust to occasional latency spikes. */
export function medianOffsetMs(samples: ClockSample[]): number {
  if (samples.length === 0) return 0;
  const offsets = samples.map(estimateOffsetMs).sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  return offsets.length % 2 === 0 ? (offsets[mid - 1]! + offsets[mid]!) / 2 : offsets[mid]!;
}

/**
 * Offset from the lowest-RTT sample — the NTP "best sample", typically the most accurate
 * because it suffered the least asymmetric queuing delay. Falls back to 0 with no samples.
 */
export function bestSampleOffsetMs(samples: ClockSample[]): number {
  if (samples.length === 0) return 0;
  const best = samples.reduce((a, b) => (roundTripMs(b) < roundTripMs(a) ? b : a));
  return estimateOffsetMs(best);
}

/** Server time approximated from the local clock and a known offset. */
export function serverNow(localNow: number, offsetMs: number): number {
  return localNow + offsetMs;
}

/**
 * Milliseconds to wait on the LOCAL clock before an event scheduled at absolute server time
 * `targetServerEpoch`. Never negative. local target = targetServerEpoch - offset.
 */
export function msUntil(targetServerEpoch: number, localNow: number, offsetMs: number): number {
  return Math.max(0, targetServerEpoch - offsetMs - localNow);
}
