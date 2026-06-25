// ⚠️ THROWAWAY — Phase 0 voice-latency probe (Story 1.4).
//
// One-way live-voice latency ≈ round-trip / 2. We probe the SAME peer connection the voice
// rides on by echoing tiny timestamped messages over an RTCDataChannel, so the measured path
// matches the audio path (NFR3 ≤150ms). The transport is injected so the math is testable.

import type { LatencySample } from './types.ts';

/** Minimal echo transport: send a payload, resolve when the peer echoes it back. */
export interface EchoTransport {
  /** Send `nonce`; resolves once the peer echoes the same nonce. */
  roundTrip(nonce: string): Promise<void>;
  /** Monotonic clock (ms). */
  now(): number;
}

/** One-way latency (ms) for a set of round-trip samples: median(rtt) / 2. */
export function oneWayLatencyMs(samples: LatencySample[]): number {
  if (samples.length === 0) return 0;
  const rtts = samples.map((s) => s.rttMs).sort((a, b) => a - b);
  const mid = Math.floor(rtts.length / 2);
  const medianRtt =
    rtts.length % 2 === 0 ? (rtts[mid - 1]! + rtts[mid]!) / 2 : rtts[mid]!;
  return medianRtt / 2;
}

/** Collect `count` round-trip samples over the echo transport. */
export async function probeLatency(
  transport: EchoTransport,
  count = 10,
): Promise<LatencySample[]> {
  const samples: LatencySample[] = [];
  for (let i = 0; i < count; i++) {
    const t0 = transport.now();
    await transport.roundTrip(`probe-${i}`);
    samples.push({ rttMs: transport.now() - t0 });
  }
  return samples;
}
