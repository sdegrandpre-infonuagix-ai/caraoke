import { useCallback } from 'react';
import {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  type DiscoveryDocument,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { authConfig, cognitoDiscovery, cognitoIdpName, type FederatedProvider } from './config';
import { useAuthStore } from '../stores/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

/**
 * Drives the Cognito hosted-UI OAuth (authorization-code + PKCE) flow for federated
 * Apple/Google sign-in (FR1). A fresh AuthRequest is built per tap so the chosen
 * `identity_provider` is baked into the authorize URL. On success the ID token is persisted
 * to the secure store and the auth store flips to signed-in.
 */
export function useCognitoSignIn() {
  const discovery = cognitoDiscovery(authConfig.domain) as DiscoveryDocument;
  const redirectUri = makeRedirectUri({ scheme: 'caraoke', path: 'auth/callback' });
  const setSession = useAuthStore((s) => s.setSession);
  const ready = authConfig.domain !== '' && authConfig.clientId !== '';

  const signIn = useCallback(
    async (provider: FederatedProvider): Promise<boolean> => {
      const request = new AuthRequest({
        clientId: authConfig.clientId,
        redirectUri,
        responseType: ResponseType.Code,
        scopes: ['openid', 'email', 'profile'],
        usePKCE: true,
        extraParams: { identity_provider: cognitoIdpName(provider) },
      });

      const result = await request.promptAsync(discovery);
      if (result.type !== 'success' || !result.params.code) return false;

      const tokens = await exchangeCodeAsync(
        {
          clientId: authConfig.clientId,
          code: result.params.code,
          redirectUri,
          extraParams: request.codeVerifier
            ? { code_verifier: request.codeVerifier }
            : undefined,
        },
        discovery,
      );

      if (!tokens.idToken) return false;
      await setSession(tokens.idToken, tokens.refreshToken ?? undefined);
      return true;
    },
    [discovery, redirectUri, setSession],
  );

  return { signIn, ready };
}
