// ⚠️ THROWAWAY — Phase 0 drift sampler (Story 1.4).
//
// Drift = how far a phone's backing-track position has slipped from where it *should* be,
// given the shared simultaneous start. Sampled live during the song (position vs wallclock).

import type { DriftSample } from './types.ts';
import { SpotifyClient } from '../app/src/lib/spotifyClient.ts';

/** Build one drift sample from a position reading taken at coordinator-time `at`. */
export function driftSample(
  role: DriftSample['role'],
  startAt: number,
  at: number,
  positionMs: number,
): DriftSample {
  const expectedMs = at - startAt;
  return { role, at, positionMs, expectedMs, errorMs: positionMs - expectedMs };
}

/**
 * Inter-device drift between two phones' samples taken at (approximately) the same instant:
 * the absolute difference of their position errors. This is the NFR2 quantity (≤50ms).
 */
export function interDeviceDriftMs(a: DriftSample, b: DriftSample): number {
  return Math.abs(a.errorMs - b.errorMs);
}

/**
 * Pair two phones' drift logs by nearest timestamp and return per-pair inter-device drift
 * magnitudes (ms). Samples more than `toleranceMs` apart are skipped (not comparable).
 */
export function pairedDriftSeries(
  operator: DriftSample[],
  partner: DriftSample[],
  toleranceMs = 1000,
): number[] {
  const out: number[] = [];
  for (const o of operator) {
    let best: DriftSample | null = null;
    let bestDelta = Infinity;
    for (const p of partner) {
      const delta = Math.abs(p.at - o.at);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = p;
      }
    }
    if (best && bestDelta <= toleranceMs) out.push(interDeviceDriftMs(o, best));
  }
  return out;
}

/**
 * Live sampler: every `intervalMs`, read this phone's Spotify position and emit a sample.
 * `nowFn` returns coordinator-time (local clock + offset). Returns a stop() function.
 */
export function startDriftSampler(args: {
  spotify: SpotifyClient;
  role: DriftSample['role'];
  startAt: number;
  nowFn: () => number;
  intervalMs?: number;
  onSample: (s: DriftSample) => void;
}): () => void {
  const interval = setInterval(async () => {
    const reading = await args.spotify.positionMs();
    if (!reading) return;
    args.onSample(driftSample(args.role, args.startAt, args.nowFn(), reading.positionMs));
  }, args.intervalMs ?? 2000);
  return () => clearInterval(interval);
}
