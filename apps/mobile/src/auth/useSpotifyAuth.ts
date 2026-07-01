import { useCallback } from 'react';
import {
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  useAuthRequest,
  type DiscoveryDocument,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

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

export interface SpotifyTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Runs the Spotify Authorization-Code + PKCE flow (no client secret on device) and returns
 * the resulting tokens. The API verifies Premium and stores the link (Story 2.4).
 */
export function useSpotifyAuth() {
  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
  const redirectUri = makeRedirectUri({ scheme: 'caraoke', path: 'spotify/callback' });

  const [request, , promptAsync] = useAuthRequest(
    { clientId, scopes: SCOPES, usePKCE: true, redirectUri, responseType: ResponseType.Code },
    discovery,
  );

  const authorize = useCallback(async (): Promise<SpotifyTokens | null> => {
    const result = await promptAsync();
    if (result.type !== 'success' || !result.params.code) return null;

    const tokens = await exchangeCodeAsync(
      {
        clientId,
        code: result.params.code,
        redirectUri,
        extraParams: request?.codeVerifier
          ? { code_verifier: request.codeVerifier }
          : undefined,
      },
      discovery,
    );
    if (!tokens.accessToken) return null;
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? undefined };
  }, [promptAsync, request, redirectUri, clientId]);

  return { authorize, ready: request != null && clientId !== '' };
}
