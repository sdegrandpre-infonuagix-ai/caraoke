// ⚠️ THROWAWAY — Phase 0 measurement (Story 1.4). Pure summary statistics.

import type { Stat } from './types.ts';

/** Percentile (linear interpolation) over a numeric array. p in [0,1]. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Summarize a series of magnitudes (count, mean, p95, max). Values should be >= 0. */
export function summarize(values: number[]): Stat {
  return {
    count: values.length,
    meanMs: mean(values),
    p95Ms: percentile(values, 0.95),
    maxMs: values.length === 0 ? 0 : Math.max(...values),
  };
}
