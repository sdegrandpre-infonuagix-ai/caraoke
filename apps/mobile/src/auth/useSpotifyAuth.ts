import { useCallback } from 'react';
import { ResponseType, useAuthRequest, type DiscoveryDocument } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { setSpotifyPending } from './pendingAuth';
import { completeSpotifyLink, SPOTIFY_REDIRECT_URI } from './completeSignIn';

WebBrowser.maybeCompleteAuthSession();

const discovery: DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// Scopes: read profile/email (Premium check) + playback control for the duet (Epic 4).
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-modify-playback-state',
  'user-read-playback-state',
];

/**
 * Spotify Authorization-Code + PKCE (no client secret on device). The return is an HTTPS App
 * Link (https://api.caraoke.ai/spotify/callback) routed by Expo Router to app/spotify/callback,
 * which exchanges the code and links the account server-side (Story 2.4). We stash the PKCE
 * verifier before opening the browser; if the auth session catches the redirect itself, we
 * complete inline as a fallback (idempotent).
 */
export function useSpotifyAuth() {
  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

  const [request, , promptAsync] = useAuthRequest(
    { clientId, scopes: SCOPES, usePKCE: true, redirectUri: SPOTIFY_REDIRECT_URI, responseType: ResponseType.Code },
    discovery,
  );

  const authorize = useCallback(async (): Promise<void> => {
    if (!request) return;
    setSpotifyPending({ codeVerifier: request.codeVerifier ?? '', state: request.state });
    const result = await promptAsync();
    if (result.type === 'success' && result.params.code) {
      await completeSpotifyLink(result.params.code, result.params.state);
    }
  }, [request, promptAsync]);

  return { authorize, ready: request != null && clientId !== '' };
}
