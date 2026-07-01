import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { StripeIdentityProvider } from './index.js';

// Stripe secret key lives in AWS Secrets Manager — never in env vars or device (NFR11).
// The SDK instance is created lazily once and reused across warm invocations.

export class LiveStripeIdentityProvider implements StripeIdentityProvider {
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

  async createVerificationSession() {
    const stripe = await this.stripe;
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      options: { document: { require_matching_selfie: true } },
      metadata: { purpose: 'age_verification' },
    });
    return { clientSecret: session.client_secret!, sessionId: session.id };
  }

  async getVerificationResult(sessionId: string) {
    const stripe = await this.stripe;
    const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
      expand: ['verified_outputs'],
    });

    let is18Plus = false;
    if (session.status === 'verified') {
      const outputs = session.verified_outputs as Stripe.Identity.VerificationSession.VerifiedOutputs | null;
      const dob = outputs?.dob;
      if (dob?.year != null && dob?.month != null && dob?.day != null) {
        const birthDate = new Date(dob.year, dob.month - 1, dob.day);
        const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        is18Plus = ageYears >= 18;
      }
    }

    return { is18Plus };
  }
}
