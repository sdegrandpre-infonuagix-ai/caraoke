// Completes an OAuth flow from a callback `code`. Called by the callback SCREENS
// (app/auth/callback, app/spotify/callback) — and, as a fallback, by the initiating hooks if
// the auth session itself catches the redirect. Both paths take the pending PKCE verifier, so
// whichever runs first wins and the other no-ops (the code is single-use).

import { exchangeCodeAsync, type DiscoveryDocument } from 'expo-auth-session';
import { authConfig, cognitoDiscovery } from './config';
import { takeCognitoPending, takeSpotifyPending } from './pendingAuth';
import { useAuthStore } from '../stores/useAuthStore';
import { linkSpotify } from '../api/spotify';

export const COGNITO_REDIRECT_URI = 'https://api.caraoke.ai/auth/callback';
export const SPOTIFY_REDIRECT_URI = 'https://api.caraoke.ai/spotify/callback';

const spotifyDiscovery: DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

/** Exchange a Cognito auth code and persist the session. Returns true on success. */
export async function completeCognitoSignIn(code: string, state?: string): Promise<boolean> {
  const pending = takeCognitoPending();
  if (!pending) return false; // already completed, or no flow in progress
  if (state && pending.state && state !== pending.state) return false; // CSRF guard

  const tokens = await exchangeCodeAsync(
    {
      clientId: authConfig.clientId,
      code,
      redirectUri: COGNITO_REDIRECT_URI,
      extraParams: { code_verifier: pending.codeVerifier },
    },
    cognitoDiscovery(authConfig.domain),
  );
  if (!tokens.idToken) return false;
  await useAuthStore.getState().setSession(tokens.idToken, tokens.refreshToken ?? undefined);
  return true;
}

/** Exchange a Spotify auth code and link the account server-side. Returns true on success. */
export async function completeSpotifyLink(code: string, state?: string): Promise<boolean> {
  const pending = takeSpotifyPending();
  if (!pending) return false;
  if (state && pending.state && state !== pending.state) return false;

  const idToken = useAuthStore.getState().idToken;
  if (!idToken) return false;

  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
  const tokens = await exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri: SPOTIFY_REDIRECT_URI,
      extraParams: { code_verifier: pending.codeVerifier },
    },
    spotifyDiscovery,
  );
  if (!tokens.accessToken) return false;
  await linkSpotify(idToken, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? undefined,
  });
  return true;
}
