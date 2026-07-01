import type { SubscriptionStatus } from './subscriptionStatus.js';

const UTC_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Format an ISO date string as "Month D, YYYY" using UTC to avoid TZ drift in tests. */
export function formatPeriodEnd(isoDate: string): string {
  const d = new Date(isoDate);
  return `${UTC_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Human-readable confirmation message shown before cancellation. */
export function confirmCancelPrompt(): string {
  return "Cancel subscription? You can still sing until your billing period ends.";
}

/** Post-cancellation message: tells the user when access ends. */
export function cancellationMessage(currentPeriodEnd: string): string {
  return `Subscription canceled. You'll have access until ${formatPeriodEnd(currentPeriodEnd)}.`;
}

/** True when the status indicates a pending cancel (Stripe sets cancel_at_period_end). */
export function isCancelPending(status: SubscriptionStatus | string): boolean {
  return status === 'active' || status === 'trialing';
}

/** Plan change confirmation message shown after a successful upgrade/downgrade. */
export function planChangedMessage(newPriceId: string): string {
  return `Plan updated to ${newPriceId}. Prorations apply at your next billing cycle.`;
}
