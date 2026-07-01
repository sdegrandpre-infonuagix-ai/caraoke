export interface RevenueSnapshot {
  mrrCents: number;
  churnRate: number;
  failedPaymentRate: number;
  subscriptionCounts: Record<string, number>;
  activeCount: number;
}

/** Format MRR in dollars (e.g. "$99.90"). */
export function mrrLabel(mrrCents: number): string {
  return `$${(mrrCents / 100).toFixed(2)}`;
}

/** Human-readable churn rate (e.g. "5.0%"). */
export function churnRateLabel(churnRate: number): string {
  return `${(churnRate * 100).toFixed(1)}%`;
}

/** Human-readable failed-payment rate (e.g. "2.3%"). */
export function failedPaymentRateLabel(failedPaymentRate: number): string {
  return `${(failedPaymentRate * 100).toFixed(1)}%`;
}

/** Compute MRR from active count and per-seat price in cents. */
export function computeMRR(activeCount: number, monthlyPriceCents: number): number {
  return activeCount * monthlyPriceCents;
}

/** Whether churn is within acceptable range (<=10%). */
export function isChurnHealthy(churnRate: number): boolean {
  return churnRate <= 0.1;
}
