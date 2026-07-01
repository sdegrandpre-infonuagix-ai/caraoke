// Auth configuration from public build-time env (EXPO_PUBLIC_*). Non-secret values only —
// the Cognito app client is public (no client secret) per the mobile OAuth + PKCE flow.

export const authConfig = {
  /** e.g. caraoke-dev-auth.auth.ca-central-1.amazoncognito.com */
  domain: process.env.EXPO_PUBLIC_COGNITO_DOMAIN ?? '',
  clientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
};

/** Cognito hosted-UI OAuth endpoints derived from the domain. */
export function cognitoDiscovery(domain: string) {
  return {
    authorizationEndpoint: `https://${domain}/oauth2/authorize`,
    tokenEndpoint: `https://${domain}/oauth2/token`,
    revocationEndpoint: `https://${domain}/oauth2/revoke`,
  };
}

export type FederatedProvider = 'apple' | 'google';

/** Map our provider enum to the Cognito identity_provider parameter. */
export function cognitoIdpName(provider: FederatedProvider): string {
  return provider === 'google' ? 'Google' : 'SignInWithApple';
}
