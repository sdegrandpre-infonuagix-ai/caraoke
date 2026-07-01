/**
 * Pure helpers for the admin billing console (Story 8.5, FR45/FR46).
 */

export type DisputeStatus = 'warning_needs_response' | 'needs_response' | 'under_review' | 'won' | 'lost' | 'charge_refunded';

export function disputeStatusLabel(status: DisputeStatus | string): string {
  const labels: Record<string, string> = {
    warning_needs_response: 'Warning — Action needed',
    needs_response: 'Needs response',
    under_review: 'Under review',
    won: 'Won',
    lost: 'Lost',
    charge_refunded: 'Refunded',
  };
  return labels[status] ?? 'Unknown';
}

/** Format a refund label for the admin audit log. */
export function refundLabel(amountCents: number, currency: string): string {
  const dollars = (amountCents / 100).toFixed(2);
  const symbol = currency.toUpperCase() === 'CAD' || currency.toUpperCase() === 'USD' ? '$' : '';
  return `Refund: ${symbol}${dollars} ${currency.toUpperCase()}`;
}

/** True if a subscription status indicates the user is or was in trouble. */
export function isAtRiskStatus(status: string | null): boolean {
  return status === 'past_due' || status === 'unpaid' || status === 'canceled';
}
