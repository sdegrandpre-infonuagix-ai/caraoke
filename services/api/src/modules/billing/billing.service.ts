import { AppError } from '@caraoke/shared';
import type { BillingRepository } from './billing.repository.js';
import type { StripeBillingProvider, InvoiceSummary } from '../../integrations/stripe/billing.provider.js';

// A subscription in any of these Stripe statuses still exists at Stripe and would keep billing
// if we created a second one. `canceled`/`incomplete_expired` are terminal — a new subscription
// is safe from those states. Blocking only active/trialing (the old guard) let a past_due or
// unpaid subscriber double-subscribe.
const LIVE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'paused',
]);

export class BillingService {
  private readonly allowedPriceIds: Set<string>;

  constructor(
    private readonly repo: BillingRepository,
    private readonly stripe: StripeBillingProvider,
    private readonly priceId: string,
    /** Prices a caller may switch to via changePlan. Defaults to the single configured price. */
    allowedPriceIds: readonly string[] = [priceId],
  ) {
    this.allowedPriceIds = new Set(allowedPriceIds);
  }

  /**
   * Lazily create a Stripe customer for the user if one doesn't exist, then return a
   * SetupIntent clientSecret so the mobile Stripe SDK can collect the payment method
   * without card numbers ever touching our backend (FR38, NFR7).
   */
  async createSetupIntent(
    userId: string,
    email: string,
  ): Promise<{ clientSecret: string }> {
    const customerId = await this.ensureCustomer(userId, email);
    return this.stripe.createSetupIntent(customerId);
  }

  /**
   * Attach the payment method collected by the mobile SDK and create a subscription.
   * Returns enough info for the client to reflect subscription state immediately.
   */
  async subscribe(
    userId: string,
    email: string,
    paymentMethodId: string,
  ): Promise<{ subscriptionId: string; status: string; currentPeriodEnd: Date }> {
    // Guard against a duplicate subscription (double-tap / retry). Without this, a second
    // Stripe subscription is created and bills forever while the DB only tracks the latest,
    // making the orphaned charge invisible and un-cancellable via the API.
    const existing = await this.repo.findByUserId(userId);
    if (existing?.subscriptionId && LIVE_SUBSCRIPTION_STATUSES.has(existing.subscriptionStatus ?? '')) {
      throw new AppError('CONFLICT', 'You already have an active subscription.');
    }
    const customerId = await this.ensureCustomer(userId, email);
    // Idempotency key keyed on (user, payment method) collapses a double-tapped subscribe into a
    // single Stripe subscription, while still allowing a genuine retry with a different card. It
    // does not close a true concurrent race (that needs a DB uniqueness constraint) but removes
    // the common duplicate-charge path.
    const sub = await this.stripe.createSubscription(customerId, paymentMethodId, this.priceId, {
      idempotencyKey: `sub_create:${userId}:${paymentMethodId}`,
    });
    await this.repo.saveSubscription(userId, sub.subscriptionId, sub.status, sub.currentPeriodEnd);
    return sub;
  }

  /** Cancel at period end — subscriber keeps access until currentPeriodEnd (FR39). */
  async cancelSubscription(userId: string): Promise<{ status: string; currentPeriodEnd: Date }> {
    const record = await this.repo.findByUserId(userId);
    if (!record?.subscriptionId) throw new AppError('NOT_FOUND', 'No active subscription.');
    const result = await this.stripe.cancelSubscription(record.subscriptionId);
    await this.repo.updateSubscriptionStatus(userId, result.status, result.currentPeriodEnd);
    return result;
  }

  /** Swap price (upgrade/downgrade) with prorations (FR39). */
  async changePlan(
    userId: string,
    email: string,
    newPriceId: string,
  ): Promise<{ status: string; currentPeriodEnd: Date }> {
    // Only allow switching to a price we actually offer — otherwise a caller could point their
    // subscription at any Stripe price id (including a $0 or attacker-created price) and pay
    // whatever they choose.
    if (!this.allowedPriceIds.has(newPriceId)) {
      throw new AppError('VALIDATION_FAILED', 'That subscription plan is not available.');
    }
    await this.ensureCustomer(userId, email);
    const record = await this.repo.findByUserId(userId);
    if (!record?.subscriptionId) throw new AppError('NOT_FOUND', 'No active subscription.');
    const result = await this.stripe.changeSubscriptionPlan(record.subscriptionId, newPriceId);
    await this.repo.updateSubscriptionStatus(userId, result.status, result.currentPeriodEnd);
    return result;
  }

  /** Retrieve invoice history for the billing-history screen (FR40). */
  async getBillingHistory(userId: string): Promise<InvoiceSummary[]> {
    const record = await this.repo.findByUserId(userId);
    if (!record) return [];
    return this.stripe.listInvoices(record.stripeCustomerId);
  }

  async getStatus(userId: string): Promise<{
    subscribed: boolean;
    status: string | null;
    currentPeriodEnd: Date | null;
  }> {
    const record = await this.repo.findByUserId(userId);
    if (!record) return { subscribed: false, status: null, currentPeriodEnd: null };
    const subscribed = ['active', 'trialing'].includes(record.subscriptionStatus ?? '');
    return {
      subscribed,
      status: record.subscriptionStatus,
      currentPeriodEnd: record.currentPeriodEnd,
    };
  }

  private async ensureCustomer(userId: string, email: string): Promise<string> {
    const record = await this.repo.findByUserId(userId);
    if (record) return record.stripeCustomerId;
    const { customerId } = await this.stripe.createCustomer(email);
    await this.repo.upsertCustomer(userId, customerId);
    return customerId;
  }
}
