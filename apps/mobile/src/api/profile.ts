import { apiFetch } from './client';
import type { Me } from './useMe';

/** Persist editable profile fields (FR1). */
export function updateProfile(
  token: string,
  patch: { displayName: string | null },
): Promise<Me> {
  return apiFetch<Me>('/me', { method: 'PATCH', token, body: patch });
}

/** Irreversibly delete the account and all associated data (FR6). */
export function deleteAccount(token: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>('/me', { method: 'DELETE', token });
}
