import type { StripeIdentityProvider } from './index.js';

/** Test/dev mock — always returns a verified adult (skips the real Stripe flow). */
export class MockStripeIdentityProvider implements StripeIdentityProvider {
  async createVerificationSession(ownerId: string) {
    // Encode the owner in the session id so getVerificationResult round-trips ownership,
    // matching the live provider's metadata.ownerId (keeps the IDOR guard testable).
    return { clientSecret: 'vs_test_mock_client_secret', sessionId: `vs_test_mock_${ownerId}` };
  }

  async getVerificationResult(sessionId: string) {
    const ownerId = sessionId.startsWith('vs_test_mock_')
      ? sessionId.slice('vs_test_mock_'.length)
      : undefined;
    return { is18Plus: true, ownerId };
  }
}
