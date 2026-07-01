/**
 * Pure metric formatting helpers for the admin dashboard (Story 8.4, FR44).
 * All functions are side-effect-free for easy testing.
 */

/** Format a 0–1 rate as a percentage string (e.g. 0.72 → "72%"). */
export function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Format a duration in milliseconds as a human-readable string (e.g. "1.2s", "450ms"). */
export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/** Format a drift offset in ms with sign (e.g. "+12ms", "-5ms", "0ms"). */
export function formatDrift(ms: number): string {
  if (ms === 0) return '0ms';
  const sign = ms > 0 ? '+' : '';
  return `${sign}${Math.round(ms)}ms`;
}

/** Format a count as a locale-style compact string (e.g. 1234 → "1,234"). */
export function formatCount(n: number): string {
  return n.toLocaleString('en-CA');
}

/** Format a p95 value with its label (e.g. "p95: 320ms"). */
export function formatP95(ms: number): string {
  return `p95: ${formatLatency(ms)}`;
}
