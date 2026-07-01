import type { StripeIdentityProvider } from './index.js';

/** Test/dev mock — always returns a verified adult (skips the real Stripe flow). */
export class MockStripeIdentityProvider implements StripeIdentityProvider {
  async createVerificationSession() {
    return { clientSecret: 'vs_test_mock_client_secret', sessionId: 'vs_test_mock_123' };
  }

  async getVerificationResult(_sessionId: string) {
    return { is18Plus: true };
  }
}
