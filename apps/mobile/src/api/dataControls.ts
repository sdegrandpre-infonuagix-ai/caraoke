import { apiFetch } from './client';

/**
 * Request the user's data export (Story 6.4, FR36/NFR10).
 * Returns a JSON snapshot of the user's profile — GDPR/CCPA portability right.
 */
export function exportUserData(idToken: string): Promise<unknown> {
  return apiFetch<unknown>('/me/export', { token: idToken });
}
