import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { Env } from '../../config/env.js';

export interface StripeBillingProvider {
  createCustomer(email: string): Promise<{ customerId: string }>;
  createSetupIntent(customerId: string): Promise<{ clientSecret: string }>;
  createSubscription(
    customerId: string,
    paymentMethodId: string,
    priceId: string,
  ): Promise<{ subscriptionId: string; status: string; currentPeriodEnd: Date }>;
  /** Cancel at period end — subscriber keeps access until currentPeriodEnd (FR39). */
  cancelSubscription(subscriptionId: string): Promise<{ status: string; currentPeriodEnd: Date }>;
  /** Swap to a different price (upgrade/downgrade) with prorations (FR39). */
  changeSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<{ status: string; currentPeriodEnd: Date }>;
  /** List past invoices for the billing-history screen (FR40). */
  listInvoices(customerId: string, limit?: number): Promise<InvoiceSummary[]>;
  /** List customers for the admin billing console (FR45). */
  listAdminCustomers(limit: number): Promise<AdminCustomerSummary[]>;
  /** Issue a refund (FR45). Partial if amountCents provided; full otherwise. */
  createRefund(
    chargeId: string,
    amountCents?: number,
    reason?: string,
  ): Promise<{ refundId: string; status: string; amountCents: number }>;
}

export interface AdminCustomerSummary {
  customerId: string;
  email: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
}

export interface InvoiceSummary {
  id: string;
  /** Amount in the currency's smallest unit (e.g. cents). */
  amount: number;
  currency: string;
  status: string;
  date: string;
  receiptUrl: string | null;
  description: string | null;
}

export class LiveStripeBillingProvider implements StripeBillingProvider {
  private stripe: Promise<Stripe>;

  constructor(region: string) {
    this.stripe = this.buildClient(region);
  }

  private async buildClient(region: string): Promise<Stripe> {
    const sm = new SecretsManagerClient({ region });
    const { SecretString } = await sm.send(
      new GetSecretValueCommand({ SecretId: 'caraoke/stripe-secret-key' }),
    );
    const { stripeSecretKey } = JSON.parse(SecretString ?? '{}') as { stripeSecretKey: string };
    return new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
  }

  async createCustomer(email: string): Promise<{ customerId: string }> {
    const stripe = await this.stripe;
    const customer = await stripe.customers.create({ email });
    return { customerId: customer.id };
  }

  async createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
    const stripe = await this.stripe;
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
    });
    return { clientSecret: intent.client_secret! };
  }

  async createSubscription(
    customerId: string,
    paymentMethodId: string,
    priceId: string,
  ): Promise<{ subscriptionId: string; status: string; currentPeriodEnd: Date }> {
    const stripe = await this.stripe;
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });
    return {
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    };
  }

  async cancelSubscription(
    subscriptionId: string,
  ): Promise<{ status: string; currentPeriodEnd: Date }> {
    const stripe = await this.stripe;
    const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return { status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) };
  }

  async changeSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<{ status: string; currentPeriodEnd: Date }> {
    const stripe = await this.stripe;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: sub.items.data[0]!.id, price: newPriceId }],
      proration_behavior: 'create_prorations',
    });
    return { status: updated.status, currentPeriodEnd: new Date(updated.current_period_end * 1000) };
  }

  async listInvoices(customerId: string, limit = 24): Promise<InvoiceSummary[]> {
    const stripe = await this.stripe;
    const { data } = await stripe.invoices.list({ customer: customerId, limit });
    return data.map((inv) => ({
      id: inv.id ?? '',
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? 'unknown',
      date: new Date((inv.created) * 1000).toISOString(),
      receiptUrl: inv.hosted_invoice_url ?? null,
      description: inv.description ?? (inv.lines.data[0]?.description ?? null),
    }));
  }

  async listAdminCustomers(limit: number): Promise<AdminCustomerSummary[]> {
    const stripe = await this.stripe;
    const { data } = await stripe.customers.list({ limit, expand: ['data.subscriptions'] });
    return data.map((c) => {
      const sub = (c.subscriptions as Stripe.ApiList<Stripe.Subscription> | undefined)?.data[0];
      return {
        customerId: c.id,
        email: c.email,
        subscriptionId: sub?.id ?? null,
        subscriptionStatus: sub?.status ?? null,
      };
    });
  }

  async createRefund(
    chargeId: string,
    amountCents?: number,
    reason?: string,
  ): Promise<{ refundId: string; status: string; amountCents: number }> {
    const stripe = await this.stripe;
    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amountCents != null ? { amount: amountCents } : {}),
      ...(reason ? { reason: reason as Stripe.RefundCreateParams.Reason } : {}),
    });
    return { refundId: refund.id, status: refund.status ?? 'pending', amountCents: refund.amount };
  }
}

export class MockStripeBillingProvider implements StripeBillingProvider {
  private counter = 0;

  async createCustomer(_email: string): Promise<{ customerId: string }> {
    return { customerId: `cus_mock_${++this.counter}` };
  }

  async createSetupIntent(_customerId: string): Promise<{ clientSecret: string }> {
    return { clientSecret: `seti_mock_${++this.counter}_secret_mock` };
  }

  async createSubscription(
    _customerId: string,
    _paymentMethodId: string,
    _priceId: string,
  ): Promise<{ subscriptionId: string; status: string; currentPeriodEnd: Date }> {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return {
      subscriptionId: `sub_mock_${++this.counter}`,
      status: 'active',
      currentPeriodEnd: end,
    };
  }

  async cancelSubscription(
    _subscriptionId: string,
  ): Promise<{ status: string; currentPeriodEnd: Date }> {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return { status: 'active', currentPeriodEnd: end };
  }

  async changeSubscriptionPlan(
    _subscriptionId: string,
    _newPriceId: string,
  ): Promise<{ status: string; currentPeriodEnd: Date }> {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return { status: 'active', currentPeriodEnd: end };
  }

  async listInvoices(_customerId: string, _limit?: number): Promise<InvoiceSummary[]> {
    return [
      {
        id: 'in_mock_001',
        amount: 999,
        currency: 'cad',
        status: 'paid',
        date: '2026-06-01T00:00:00.000Z',
        receiptUrl: null,
        description: 'Caraoke Monthly',
      },
    ];
  }

  async listAdminCustomers(_limit: number): Promise<AdminCustomerSummary[]> {
    return [
      {
        customerId: 'cus_mock_001',
        email: 'founder@caraoke.app',
        subscriptionId: 'sub_mock_001',
        subscriptionStatus: 'active',
      },
    ];
  }

  async createRefund(
    chargeId: string,
    amountCents?: number,
    _reason?: string,
  ): Promise<{ refundId: string; status: string; amountCents: number }> {
    return {
      refundId: `re_mock_${++this.counter}`,
      status: 'succeeded',
      amountCents: amountCents ?? 999,
    };
    void chargeId;
  }
}

export function getStripeBillingProvider(env: Env): StripeBillingProvider {
  return env.CARAOKE_INTEGRATIONS === 'live'
    ? new LiveStripeBillingProvider(env.AWS_REGION)
    : new MockStripeBillingProvider();
}
