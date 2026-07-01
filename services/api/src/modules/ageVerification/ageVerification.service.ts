import type { StripeIdentityProvider } from '../../integrations/stripe/index.js';

export class AgeVerificationService {
  constructor(private readonly stripe: StripeIdentityProvider) {}

  createSession() {
    return this.stripe.createVerificationSession();
  }

  getResult(sessionId: string) {
    return this.stripe.getVerificationResult(sessionId);
  }
}
