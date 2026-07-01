import type { SessionState } from '@caraoke/shared';

/** A duet session row (camelCase). The invite_token is secret-ish — see PublicSession. */
export interface Session {
  id: string;
  hostUserId: string;
  guestUserId: string | null;
  status: SessionState;
  hostReady: boolean;
  guestReady: boolean;
  pairingCode: string;
  inviteToken: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Connection view returned on join (FR8): who is in the session and whether both are present. */
export interface SessionConnection {
  session: PublicSession;
  host: { userId: string; connected: true };
  guest: { userId: string; connected: true } | null;
  bothConnected: boolean;
}

export function toConnection(s: Session): SessionConnection {
  return {
    session: toPublicSession(s),
    host: { userId: s.hostUserId, connected: true },
    guest: s.guestUserId ? { userId: s.guestUserId, connected: true } : null,
    bothConnected: s.guestUserId != null,
  };
}

/** Session view safe to return to clients (no raw invite token). */
export interface PublicSession {
  id: string;
  status: SessionState;
  expiresAt: string;
  createdAt: string;
}

/** Invite the host shares with a partner. */
export interface Invite {
  pairingCode: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface CreateSessionResult {
  session: PublicSession;
  invite: Invite;
}

export function toPublicSession(s: Session): PublicSession {
  return { id: s.id, status: s.status, expiresAt: s.expiresAt, createdAt: s.createdAt };
}
