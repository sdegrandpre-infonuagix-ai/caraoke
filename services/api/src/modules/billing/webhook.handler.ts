import type Stripe from 'stripe';
import type { BillingRepository } from './billing.repository.js';

export type WebhookEventAction = 'update_subscription' | 'payment_failed' | 'ignore';

const UPDATE_SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

const PAYMENT_FAILED_EVENTS = new Set([
  'invoice.payment_failed',
  'charge.dispute.created',
]);

/** Pure classifier — maps Stripe event type to the action we take (AR9). */
export function classifyWebhookEvent(eventType: string): WebhookEventAction {
  if (UPDATE_SUBSCRIPTION_EVENTS.has(eventType)) return 'update_subscription';
  if (PAYMENT_FAILED_EVENTS.has(eventType)) return 'payment_failed';
  return 'ignore';
}

/**
 * Idempotent event processor (AR9).
 * Subscription state updates are safe to replay — same event → same DB state.
 */
export async function processWebhookEvent(
  event: Stripe.Event,
  repo: BillingRepository,
): Promise<void> {
  const action = classifyWebhookEvent(event.type);
  if (action === 'ignore') return;

  if (action === 'update_subscription') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const record = await repo.findByCustomerId(customerId);
    if (!record) return;
    const end = new Date(sub.current_period_end * 1000);
    await repo.updateSubscriptionStatus(record.userId, sub.status, end);
    return;
  }

  if (action === 'payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as Stripe.Customer)?.id;
    if (!customerId) return;
    const record = await repo.findByCustomerId(customerId);
    if (!record) return;
    // Mark past_due; keep existing period end so the user knows when access lapses.
    await repo.updateSubscriptionStatus(
      record.userId,
      'past_due',
      record.currentPeriodEnd ?? new Date(),
    );
  }
}
