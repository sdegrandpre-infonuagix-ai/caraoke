import type { FeltSentiment } from './feltTogether.js';

/**
 * Compute the felt-together rate from a local array of sentiments (FR42 aggregation).
 * 'unclear' and 'no_response' are excluded from the denominator — only explicit yes/no counts.
 */
export function computeRate(sentiments: FeltSentiment[]): number {
  const responded = sentiments.filter((s) => s === 'yes' || s === 'no');
  if (responded.length === 0) return 0;
  const yesCount = responded.filter((s) => s === 'yes').length;
  return yesCount / responded.length;
}

/** Format a 0–1 rate as a human-readable percentage string (e.g. "72%"). */
export function rateLabel(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** One-line summary for the operator dashboard (e.g. "72% felt together (18/25 responses)"). */
export function rateSummary(rate: number, responded: number): string {
  const pct = rateLabel(rate);
  const yes = Math.round(rate * responded);
  return `${pct} felt together (${yes}/${responded} responses)`;
}
