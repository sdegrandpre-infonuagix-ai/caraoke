import { apiFetch } from './client';

export function createAgeVerificationSession(idToken: string) {
  return apiFetch<{ clientSecret: string; sessionId: string }>('/age-verification/session', {
    method: 'POST',
    token: idToken,
  });
}

export function getAgeVerificationResult(idToken: string, sessionId: string) {
  return apiFetch<{ is18Plus: boolean }>(
    `/age-verification/result?sessionId=${encodeURIComponent(sessionId)}`,
    { token: idToken },
  );
}
