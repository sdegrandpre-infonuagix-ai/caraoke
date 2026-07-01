// Pure JWT payload decoder (no verification — the API verifies; this is only for reading
// non-sensitive claims like email/exp on-device). Kept pure so it is unit-testable.

export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  [key: string]: unknown;
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const withPad = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  // atob exists in Hermes/RN and Node 16+.
  return atob(withPad);
}

/** Decode a JWT's payload, or null if malformed. Does NOT verify the signature. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]!)) as JwtPayload;
  } catch {
    return null;
  }
}

/** True if the token is absent or past its `exp` (with a small clock-skew margin). */
export function isExpired(token: string | null, nowMs: number): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= nowMs + 5000;
}
