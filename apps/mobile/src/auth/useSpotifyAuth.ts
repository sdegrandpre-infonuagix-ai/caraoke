import { useCallback } from 'react';
import { AuthRequest, ResponseType, type DiscoveryDocument } from 'expo-auth-session';
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
 * Spotify Authorization-Code + PKCE (no client secret on device). Mirrors the Cognito sign-in
 * flow (manual AuthRequest + makeAuthUrlAsync) rather than useAuthRequest, so the PKCE verifier
 * is fully generated before we stash it — a hook-timing gap there caused the token exchange to
 * fail with a bad code_verifier on iOS. The return deep-links back as caraoke://spotify/callback,
 * routed to app/spotify/callback, which exchanges the code and links the account server-side. If
 * the auth session catches the redirect inline, we complete it here as a fallback (idempotent).
 */
export function useSpotifyAuth() {
  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

  const authorize = useCallback(async (): Promise<void> => {
    const request = new AuthRequest({
      clientId,
      scopes: SCOPES,
      usePKCE: true,
      redirectUri: SPOTIFY_REDIRECT_URI,
      responseType: ResponseType.Code,
    });

    // Finalize the URL (populates codeVerifier/state), then stash them for the callback screen.
    await request.makeAuthUrlAsync(discovery);
    await setSpotifyPending({ codeVerifier: request.codeVerifier ?? '', state: request.state });

    const result = await request.promptAsync(discovery);
    if (result.type === 'success' && result.params.code) {
      await completeSpotifyLink(result.params.code, result.params.state);
    }
  }, [clientId]);

  return { authorize, ready: clientId !== '' };
}
