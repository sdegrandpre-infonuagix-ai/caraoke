import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useAuthStore } from '../stores/useAuthStore';
import type { SessionConnection } from './pairing';

export interface SavedPartner {
  partnerUserId: string;
  displayName: string | null;
  languagePref: string;
  savedAt: string;
}

/** Save a known partner (FR9). */
export function savePartner(idToken: string, partnerUserId: string): Promise<{ saved: boolean }> {
  return apiFetch('/partners', { method: 'POST', token: idToken, body: { partnerUserId } });
}

/** Forget a saved partner. */
export function removePartner(idToken: string, partnerUserId: string): Promise<{ removed: boolean }> {
  return apiFetch(`/partners/${partnerUserId}`, { method: 'DELETE', token: idToken });
}

/** Fast re-pair with a saved partner — one request to a connected session (FR9). */
export function repairWith(idToken: string, partnerUserId: string): Promise<SessionConnection> {
  return apiFetch(`/partners/${partnerUserId}/repair`, { method: 'POST', token: idToken });
}

/** Saved-partners list (server state). */
export function useSavedPartners() {
  const idToken = useAuthStore((s) => s.idToken);
  return useQuery({
    queryKey: ['partners'],
    enabled: idToken != null,
    queryFn: () => apiFetch<{ items: SavedPartner[] }>('/partners', { token: idToken ?? undefined }),
  });
}
