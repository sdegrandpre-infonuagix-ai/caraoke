import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useAuthStore } from '../stores/useAuthStore';

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
  authProvider: 'apple' | 'google' | 'cognito';
}

/** Current-user query (server state via TanStack Query). Hits GET /me with the ID token. */
export function useMe() {
  const idToken = useAuthStore((s) => s.idToken);
  return useQuery({
    queryKey: ['me'],
    enabled: idToken != null,
    queryFn: () => apiFetch<Me>('/me', { token: idToken ?? undefined }),
  });
}
