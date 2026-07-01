/**
 * Admin RBAC guard (Story 8.3, NFR11).
 * Decodes the Cognito JWT payload (without verification — verification happens server-side)
 * to check group membership on the client for rendering decisions only.
 * Hard authorization always happens on the backend.
 */

export interface CognitoTokenPayload {
  sub: string;
  email?: string;
  'cognito:groups'?: string[];
  exp: number;
}

/** Decode a JWT's payload section (no signature verification — client-side UI guard only). */
export function decodePayload(idToken: string): CognitoTokenPayload | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as CognitoTokenPayload;
  } catch {
    return null;
  }
}

/** True if the decoded token contains the 'admin' Cognito group (NFR11). */
export function isAdminToken(payload: CognitoTokenPayload | null): boolean {
  if (!payload) return false;
  return payload['cognito:groups']?.includes('admin') ?? false;
}

/** True if the token has not yet expired (compares against the provided epoch seconds). */
export function isTokenValid(payload: CognitoTokenPayload | null, nowSeconds: number): boolean {
  if (!payload) return false;
  return payload.exp > nowSeconds;
}
