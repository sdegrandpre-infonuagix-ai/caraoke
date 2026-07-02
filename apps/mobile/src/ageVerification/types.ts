// Age-verification abstraction (Story 5.2, FR32, NFR11).
// Only the boolean result and an opaque reference are stored — never the ID document.

export interface AgeVerificationResult {
  is18Plus: boolean;
  verificationRef: string;
}

export type AgeVerificationStatus =
  | 'idle'
  | 'verifying'
  | 'verified'
  | 'underage'
  | 'failed'
  | 'cancelled'
  // Stripe Identity's native document/selfie flow isn't integrated yet (see useAgeVerification).
  | 'unavailable';
