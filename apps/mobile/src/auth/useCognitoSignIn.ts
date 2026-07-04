import { useCallback } from 'react';
import { AuthRequest, ResponseType, type DiscoveryDocument } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { authConfig, cognitoDiscovery, cognitoIdpName, type FederatedProvider } from './config';
import { setCognitoPending } from './pendingAuth';
import { completeCognitoSignIn, COGNITO_REDIRECT_URI } from './completeSignIn';

WebBrowser.maybeCompleteAuthSession();

/**
 * Cognito hosted-UI OAuth (authorization-code + PKCE) for federated Apple/Google sign-in (FR1).
 *
 * The return deep-links back into the app (caraoke://auth/callback), which Expo Router routes to
 * app/auth/callback to finish the token exchange. Because that callback screen is a different
 * component than this hook, we persist the PKCE verifier before opening the browser so the screen
 * can use it. If the auth session happens to catch the redirect itself, we complete inline as a
 * fallback (idempotent — see completeCognitoSignIn).
 */
export function useCognitoSignIn() {
  const discovery = cognitoDiscovery(authConfig.domain) as DiscoveryDocument;
  const ready = authConfig.domain !== '' && authConfig.clientId !== '';

  const signIn = useCallback(
    async (provider: FederatedProvider): Promise<boolean> => {
      const request = new AuthRequest({
        clientId: authConfig.clientId,
        redirectUri: COGNITO_REDIRECT_URI,
        responseType: ResponseType.Code,
        scopes: ['openid', 'email', 'profile'],
        usePKCE: true,
        extraParams: { identity_provider: cognitoIdpName(provider) },
      });

      // Build the URL first so codeVerifier/state are populated, then stash them for the
      // callback screen (promptAsync reuses the built url, so it won't regenerate the verifier).
      await request.makeAuthUrlAsync(discovery);
      await setCognitoPending({ codeVerifier: request.codeVerifier ?? '', state: request.state });

      const result = await request.promptAsync(discovery);
      if (result.type === 'success' && result.params.code) {
        return completeCognitoSignIn(result.params.code, result.params.state);
      }
      // Otherwise the App Link → app/auth/callback completes it.
      return false;
    },
    [discovery],
  );

  return { signIn, ready };
}
