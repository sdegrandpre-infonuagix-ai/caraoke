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
    priceId: string,
  ): Promise<{ subscriptionId: string; status: string; currentPeriodEnd: Date }> {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return {
      subscriptionId: `sub_mock_${++this.counter}`,
      status: 'active',
      currentPeriodEnd: end,
    };
  }
}

export function getStripeBillingProvider(env: Env): StripeBillingProvider {
  return env.CARAOKE_INTEGRATIONS === 'live'
    ? new LiveStripeBillingProvider(env.AWS_REGION)
    : new MockStripeBillingProvider();
}
