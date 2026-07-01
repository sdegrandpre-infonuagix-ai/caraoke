import { AppError } from '@caraoke/shared';
import type { StripeIdentityProvider } from '../../integrations/stripe/index.js';

export class AgeVerificationService {
  constructor(private readonly stripe: StripeIdentityProvider) {}

  createSession(ownerId: string) {
    return this.stripe.createVerificationSession(ownerId);
  }

  async getResult(sessionId: string, callerId: string): Promise<{ is18Plus: boolean }> {
    const result = await this.stripe.getVerificationResult(sessionId);
    // Ownership check (fixes IDOR): the verification must belong to the caller. A missing or
    // mismatched owner is denied — age-verification status is privacy-sensitive (NFR11).
    if (result.ownerId !== callerId) {
      throw new AppError('FORBIDDEN', 'This verification does not belong to you.');
    }
    return { is18Plus: result.is18Plus };
  }
}
