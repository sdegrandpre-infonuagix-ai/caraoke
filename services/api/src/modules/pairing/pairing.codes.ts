import { randomBytes, randomInt } from 'node:crypto';

// Unambiguous alphabet for human-typed pairing codes — no 0/O/1/I/L.
const PAIRING_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_LENGTH = 6;

/** Generate a 6-char, human-typeable pairing code (FR7). */
export function generatePairingCode(): string {
  let code = '';
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    code += PAIRING_ALPHABET[randomInt(PAIRING_ALPHABET.length)];
  }
  return code;
}

/** Generate a high-entropy, URL-safe single-use invite token. */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Build the shareable invite URL that encodes the session via its token. */
export function buildInviteUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/join?token=${encodeURIComponent(token)}`;
}
