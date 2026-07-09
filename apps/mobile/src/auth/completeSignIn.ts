// Completes an OAuth flow from a callback `code`. Called by the callback SCREENS
// (app/auth/callback, app/spotify/callback) — and, as a fallback, by the initiating hooks if
// the auth session itself catches the redirect. Both paths take the pending PKCE verifier, so
// whichever runs first wins and the other no-ops (the code is single-use).

import { exchangeCodeAsync, type DiscoveryDocument } from 'expo-auth-session';
import { authConfig, cognitoDiscovery } from './config';
import { takeCognitoPending, takeSpotifyPending } from './pendingAuth';
import { useAuthStore } from '../stores/useAuthStore';
import { linkSpotify } from '../api/spotify';

// Custom-scheme redirects (proven to deep-link back into the app). Expo Router maps
// caraoke://auth/callback → /auth/callback (app/auth/callback) and caraoke://spotify/callback →
// /spotify/callback. The HTTPS App Link forms are also registered (assetlinks + intent filters)
// as a future hardening path, but the scheme is the primary because it doesn't depend on
// Android domain-verification succeeding on-device.
export const COGNITO_REDIRECT_URI = 'caraoke://auth/callback';
export const SPOTIFY_REDIRECT_URI = 'caraoke://spotify/callback';

const spotifyDiscovery: DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// An OAuth code is single-use. Both completion paths (the auth session's inline result AND the
// callback screen from the deep link) can fire with the SAME code; the second exchange would fail
// with "invalid authorization code". Guard synchronously so only the first attempt per code runs.
const consumedCodes = new Set<string>();
function claimCode(code: string): boolean {
  if (consumedCodes.has(code)) return false;
  consumedCodes.add(code);
  return true;
}

/** Exchange a Cognito auth code and persist the session. Returns true on success. */
export async function completeCognitoSignIn(code: string, state?: string): Promise<boolean> {
  if (!claimCode(code)) return false; // the other path already exchanged this code
  const pending = await takeCognitoPending();
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

/**
 * Exchange a Spotify auth code and link the account server-side. Returns true on success, false
 * when there's no pending flow to complete (the other path — inline vs callback screen — already
 * handled it). Real failures throw with a specific message so the UI can show the cause.
 */
export async function completeSpotifyLink(code: string, state?: string): Promise<boolean> {
  if (!claimCode(code)) return false; // the other path already exchanged this code
  const pending = await takeSpotifyPending();
  if (!pending) return false; // already completed by the other path — not an error
  if (state && pending.state && state !== pending.state) throw new Error('Spotify: state mismatch');

  const idToken = useAuthStore.getState().idToken;
  if (!idToken) throw new Error('Spotify: not signed in');

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
  if (!tokens.accessToken) throw new Error('Spotify: no access token from exchange');
  await linkSpotify(idToken, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? undefined,
  });
  return true;
}
