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

  async createVerificationSession(ownerId: string) {
    const stripe = await this.stripe;
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      options: { document: { require_matching_selfie: true } },
      // ownerId binds the verification to the requesting user so getVerificationResult can
      // enforce ownership (prevents reading another user's is18Plus via a guessed sessionId).
      metadata: { purpose: 'age_verification', ownerId },
    });
    return { clientSecret: session.client_secret!, sessionId: session.id };
  }

  async getVerificationResult(sessionId: string) {
    const stripe = await this.stripe;
    const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
      expand: ['verified_outputs'],
    });

    const ownerId = session.metadata?.ownerId;

    let is18Plus = false;
    if (session.status === 'verified') {
      const outputs = session.verified_outputs as Stripe.Identity.VerificationSession.VerifiedOutputs | null;
      const dob = outputs?.dob;
      if (dob?.year != null && dob?.month != null && dob?.day != null) {
        // Calendar-date age in UTC — a fixed 365.25-day division misjudges the exactly-18
        // boundary (leap days) and is timezone-sensitive.
        const now = new Date();
        let age = now.getUTCFullYear() - dob.year;
        const monthDelta = now.getUTCMonth() - (dob.month - 1);
        if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.day)) age--;
        is18Plus = age >= 18;
      }
    }

    return { is18Plus, ownerId };
  }
}
