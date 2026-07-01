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

export interface SessionConnection {
  session: PublicSession;
  host: { userId: string; connected: true };
  guest: { userId: string; connected: true } | null;
  bothConnected: boolean;
}

/** Create a duet session and get the invite link + pairing code (FR7). */
export function createSession(idToken: string): Promise<CreateSessionResult> {
  return apiFetch<CreateSessionResult>('/sessions', { method: 'POST', token: idToken });
}

/** Join a session by invite token (link) or pairing code (FR8). */
export function joinSession(
  idToken: string,
  invite: { token?: string; code?: string },
): Promise<SessionConnection> {
  return apiFetch<SessionConnection>('/sessions/join', {
    method: 'POST',
    token: idToken,
    body: invite,
  });
}
