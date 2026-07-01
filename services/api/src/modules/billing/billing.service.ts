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
