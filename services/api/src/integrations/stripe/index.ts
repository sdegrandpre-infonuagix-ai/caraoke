import type { Env } from '../../config/env.js';
import { LiveStripeIdentityProvider } from './live.js';
import { MockStripeIdentityProvider } from './mock.js';

/** Minimum surface needed for age verification (Story 5.2). */
export interface StripeIdentityProvider {
  createVerificationSession(ownerId: string): Promise<{ clientSecret: string; sessionId: string }>;
  getVerificationResult(sessionId: string): Promise<{ is18Plus: boolean; ownerId?: string }>;
}

export function getStripeIdentityProvider(env: Env): StripeIdentityProvider {
  return env.CARAOKE_INTEGRATIONS === 'live'
    ? new LiveStripeIdentityProvider(env.AWS_REGION)
    : new MockStripeIdentityProvider();
}
