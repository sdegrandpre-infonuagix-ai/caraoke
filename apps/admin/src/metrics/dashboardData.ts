/**
 * Pure helpers for interpreting and displaying dashboard metric data (Story 8.4, FR44).
 */

export interface FeltTogetherWindow {
  rate: number;
  yesCount: number;
  totalResponded: number;
  windowDays: number;
}

export interface DashboardData {
  feltTogether: {
    sevenDay: FeltTogetherWindow;
    thirtyDay: FeltTogetherWindow;
  };
}

/** Determine if the felt-together rate is healthy (>=60% is considered good). */
export function isFeltTogetherHealthy(rate: number): boolean {
  return rate >= 0.6;
}

/** Trend description comparing two windows. */
export function rateTrend(sevenDay: number, thirtyDay: number): string {
  const diff = sevenDay - thirtyDay;
  if (Math.abs(diff) < 0.02) return 'stable';
  return diff > 0 ? 'improving' : 'declining';
}

/** Summary sentence for a felt-together window. */
export function windowSummary(w: FeltTogetherWindow): string {
  const pct = Math.round(w.rate * 100);
  return `${pct}% felt together over the last ${w.windowDays} days (${w.yesCount}/${w.totalResponded} responded).`;
}
