import { AppError } from '@caraoke/shared';
import type { BillingRepository } from './billing.repository.js';
import type { StripeBillingProvider } from '../../integrations/stripe/billing.provider.js';

export class BillingService {
  constructor(
    private readonly repo: BillingRepository,
    private readonly stripe: StripeBillingProvider,
    private readonly priceId: string,
  ) {}

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
    const customerId = await this.ensureCustomer(userId, email);
    const sub = await this.stripe.createSubscription(customerId, paymentMethodId, this.priceId);
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
    await this.ensureCustomer(userId, email);
    const record = await this.repo.findByUserId(userId);
    if (!record?.subscriptionId) throw new AppError('NOT_FOUND', 'No active subscription.');
    const result = await this.stripe.changeSubscriptionPlan(record.subscriptionId, newPriceId);
    await this.repo.updateSubscriptionStatus(userId, result.status, result.currentPeriodEnd);
    return result;
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
