import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useAuthStore } from '../stores/useAuthStore';

export interface ReadyState {
  sessionId: string;
  status: string;
  hostReady: boolean;
  guestReady: boolean;
  bothReady: boolean;
}

/** Mark this participant ready (FR10). */
export function markReady(idToken: string, sessionId: string): Promise<ReadyState> {
  return apiFetch<ReadyState>(`/sessions/${sessionId}/ready`, { method: 'POST', token: idToken });
}

/**
 * Poll the ready state. Until the AppSync Events client subscription lands, polling surfaces
 * the partner's readiness; the server is the single source of truth either way.
 */
export function useReadyState(sessionId: string | undefined) {
  const idToken = useAuthStore((s) => s.idToken);
  return useQuery({
    queryKey: ['ready', sessionId],
    enabled: idToken != null && sessionId != null,
    refetchInterval: (q) => (q.state.data?.bothReady ? false : 2000),
    queryFn: () =>
      apiFetch<ReadyState>(`/sessions/${sessionId}/ready`, { token: idToken ?? undefined }),
  });
}
