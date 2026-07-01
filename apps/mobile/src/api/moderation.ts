import { apiFetch } from './client';

/** Block a user — prevents future pairing (Story 6.1, FR33). */
export function blockUser(idToken: string, targetUserId: string): Promise<void> {
  return apiFetch<void>('/moderation/block', {
    method: 'POST',
    token: idToken,
    body: { targetUserId },
  });
}

/** File an abuse report with optional session context (Story 6.1, FR33). */
export function reportUser(
  idToken: string,
  targetUserId: string,
  sessionId?: string,
  reason?: string,
): Promise<void> {
  return apiFetch<void>('/moderation/report', {
    method: 'POST',
    token: idToken,
    body: { targetUserId, sessionId, reason },
  });
}
