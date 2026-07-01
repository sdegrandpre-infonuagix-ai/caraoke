import { useCallback, useState } from 'react';
import { useStripeIdentity } from '@stripe/stripe-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { createAgeVerificationSession, getAgeVerificationResult } from '../api/ageVerification';
import type { AgeVerificationResult, AgeVerificationStatus } from './types';

/**
 * Age verification hook (Story 5.2, FR32, NFR11). Uses the Stripe Identity SDK to present
 * a document scan + selfie flow. After FlowCompleted, queries the backend for the is18Plus
 * result — only that boolean + a session reference are returned, never the document.
 *
 * Requires <StripeProvider> in the component tree (wired in _layout.tsx).
 */
export function useAgeVerification() {
  const idToken = useAuthStore((s) => s.idToken);
  const [status, setStatus] = useState<AgeVerificationStatus>('idle');

  const fetchClientSecret = useCallback(async () => {
    const { clientSecret } = await createAgeVerificationSession(idToken ?? '');
    return { clientSecret };
  }, [idToken]);

  const { present, loading } = useStripeIdentity(fetchClientSecret);

  const verify = useCallback(async (): Promise<AgeVerificationResult | null> => {
    setStatus('verifying');
    try {
      const result = await present();

      if (!result || result.status === 'FlowCanceled') {
        setStatus('cancelled');
        return null;
      }
      if (result.status === 'FlowFailed') {
        setStatus('failed');
        return null;
      }

      // FlowCompleted — query backend for the age determination.
      // Backend checks the verified DOB from Stripe; we receive only the boolean (NFR11).
      const sessionId = result.verificationSession ?? '';
      const { is18Plus } = await getAgeVerificationResult(idToken ?? '', sessionId);

      setStatus(is18Plus ? 'verified' : 'underage');
      return { is18Plus, verificationRef: sessionId };
    } catch {
      setStatus('failed');
      return null;
    }
  }, [present, idToken]);

  const reset = useCallback(() => setStatus('idle'), []);

  return { verify, status, loading, reset };
}
