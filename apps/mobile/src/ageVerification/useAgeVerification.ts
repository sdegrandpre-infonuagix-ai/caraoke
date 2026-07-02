import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { createAgeVerificationSession, getAgeVerificationResult } from '../api/ageVerification';
import type { AgeVerificationResult, AgeVerificationStatus } from './types';

/**
 * Age verification hook (Story 5.2, FR32, NFR11).
 *
 * NOTE: the on-device document/selfie flow is NOT wired. `@stripe/stripe-react-native` does not
 * expose `useStripeIdentity` — Stripe Identity requires the separate native StripeIdentity SDK,
 * which isn't integrated. Until it is, `verify()` reports 'unavailable' (never a false pass).
 * The pieces that already work are kept so wiring the native flow later is a drop-in: the backend
 * creates the verification session, and `getAgeVerificationResult` returns only the is18Plus
 * boolean + an opaque ref (never the document, NFR11).
 */
export function useAgeVerification() {
  const idToken = useAuthStore((s) => s.idToken);
  const [status, setStatus] = useState<AgeVerificationStatus>('idle');

  const verify = useCallback(async (): Promise<AgeVerificationResult | null> => {
    setStatus('verifying');
    try {
      // Backend session creation works today; presenting the native Identity flow does not.
      const { sessionId } = await createAgeVerificationSession(idToken ?? '');
      // Drop-in point once the native flow is integrated:
      //   await presentStripeIdentity(clientSecret);
      //   const { is18Plus } = await getAgeVerificationResult(idToken ?? '', sessionId);
      void sessionId;
      void getAgeVerificationResult;
      setStatus('unavailable');
      return null;
    } catch {
      setStatus('failed');
      return null;
    }
  }, [idToken]);

  const reset = useCallback(() => setStatus('idle'), []);

  return { verify, status, loading: false, reset };
}
