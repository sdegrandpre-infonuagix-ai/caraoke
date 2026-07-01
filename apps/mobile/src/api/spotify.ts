import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useAuthStore } from '../stores/useAuthStore';

export interface SpotifyStatus {
  linked: boolean;
  isPremium: boolean;
  product: string | null;
  spotifyUserId: string | null;
  displayName: string | null;
}

/** Link Spotify + verify Premium (FR2). Sends the OAuth tokens to the API. */
export function linkSpotify(
  idToken: string,
  tokens: { accessToken: string; refreshToken?: string },
): Promise<SpotifyStatus> {
  return apiFetch<SpotifyStatus>('/me/spotify', {
    method: 'POST',
    token: idToken,
    body: tokens,
  });
}

/** Current Spotify link status for the signed-in user. */
export function useSpotifyStatus() {
  const idToken = useAuthStore((s) => s.idToken);
  return useQuery({
    queryKey: ['spotify'],
    enabled: idToken != null,
    queryFn: () => apiFetch<SpotifyStatus>('/me/spotify', { token: idToken ?? undefined }),
  });
}
