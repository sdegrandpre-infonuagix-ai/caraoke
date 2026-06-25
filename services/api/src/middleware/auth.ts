import type { RequestHandler } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { AppError } from '@caraoke/shared';
import { loadEnv } from '../config/env.js';
import type { AuthClaims, AuthProvider } from '../modules/identity/identity.types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authClaims?: AuthClaims;
    }
  }
}

/** Verifies a bearer token and returns normalized claims. */
export interface TokenVerifier {
  verify(token: string): Promise<AuthClaims>;
}

/** Map a Cognito ID-token payload to our AuthClaims (federated provider → enum). */
export function mapCognitoPayload(payload: Record<string, unknown>): AuthClaims {
  const sub = String(payload.sub ?? '');
  const email = String(payload.email ?? '');
  const name = payload.name ? String(payload.name) : undefined;

  let authProvider: AuthProvider = 'cognito';
  const identities = payload.identities;
  if (Array.isArray(identities) && identities[0]) {
    const provider = String((identities[0] as { providerName?: string }).providerName ?? '').toLowerCase();
    if (provider.includes('google')) authProvider = 'google';
    else if (provider.includes('apple')) authProvider = 'apple';
  }

  return { cognitoSub: sub, email, displayName: name, authProvider };
}

/** Live Cognito verifier (aws-jwt-verify). Lazily constructed from env. */
export class CognitoTokenVerifier implements TokenVerifier {
  private verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

  private getVerifier() {
    if (this.verifier) return this.verifier;
    const env = loadEnv();
    if (!env.COGNITO_USER_POOL_ID || !env.COGNITO_CLIENT_ID) {
      throw new AppError('INTERNAL', 'Cognito is not configured.');
    }
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: env.COGNITO_USER_POOL_ID,
      tokenUse: 'id',
      clientId: env.COGNITO_CLIENT_ID,
    });
    return this.verifier;
  }

  async verify(token: string): Promise<AuthClaims> {
    const payload = await this.getVerifier().verify(token);
    return mapCognitoPayload(payload as unknown as Record<string, unknown>);
  }
}

/** Express middleware factory: require a valid bearer token, attach claims to the request. */
export function requireAuth(verifier: TokenVerifier): RequestHandler {
  return (req, _res, next) => {
    const header = req.header('authorization') ?? '';
    const match = /^Bearer (.+)$/i.exec(header);
    if (!match) {
      next(new AppError('UNAUTHORIZED', 'Missing bearer token.'));
      return;
    }
    verifier
      .verify(match[1]!)
      .then((claims) => {
        req.authClaims = claims;
        next();
      })
      .catch(() => next(new AppError('UNAUTHORIZED', 'Invalid or expired token.')));
  };
}
