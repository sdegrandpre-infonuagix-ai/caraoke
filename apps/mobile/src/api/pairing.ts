import { apiFetch } from './client';

export interface PublicSession {
  id: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface Invite {
  pairingCode: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface CreateSessionResult {
  session: PublicSession;
  invite: Invite;
}

/** Create a duet session and get the invite link + pairing code (FR7). */
export function createSession(idToken: string): Promise<CreateSessionResult> {
  return apiFetch<CreateSessionResult>('/sessions', { method: 'POST', token: idToken });
}
