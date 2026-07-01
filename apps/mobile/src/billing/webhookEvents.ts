/**
 * Webhook event type constants shared between backend and mobile.
 * Mobile uses these to display appropriate status messages after a
 * status change pushed via AppSync (Story 3.4 event bus).
 */

export type SubscriptionEventReason = 'payment_failed' | 'plan_changed' | 'canceled' | 'renewed';

export function subscriptionEventMessage(reason: SubscriptionEventReason): string {
  const messages: Record<SubscriptionEventReason, string> = {
    payment_failed: 'Your payment failed. Please update your payment method to continue singing.',
    plan_changed: 'Your plan has been updated.',
    canceled: 'Your subscription has been canceled.',
    renewed: 'Your subscription has been renewed.',
  };
  return messages[reason];
}
