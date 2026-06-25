import type { ErrorCode } from '@caraoke/shared';
import type { Session } from './pairing.types.js';

export type JoinValidation =
  | { ok: true; alreadyJoined: boolean }
  | { ok: false; code: ErrorCode; message: string };

/**
 * Pure join validation (FR8). Decides whether `joinerUserId` may join `session` at `now`,
 * returning a clear error code + message (with a recovery hint) when not. Idempotent: the
 * existing guest re-joining is allowed.
 */
export function validateJoin(
  session: Session,
  joinerUserId: string,
  now: Date,
): JoinValidation {
  if (session.status === 'ended') {
    return { ok: false, code: 'CONFLICT', message: 'This session has ended. Ask your partner for a new invite.' };
  }
  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, code: 'INVITE_EXPIRED', message: 'This invite has expired. Ask your partner for a new one.' };
  }
  if (session.hostUserId === joinerUserId) {
    return { ok: false, code: 'CONFLICT', message: 'You created this invite — share it with your partner instead.' };
  }
  if (session.guestUserId && session.guestUserId === joinerUserId) {
    return { ok: true, alreadyJoined: true };
  }
  if (session.guestUserId && session.guestUserId !== joinerUserId) {
    return { ok: false, code: 'CONFLICT', message: 'This session already has two singers. Ask your partner for a new invite.' };
  }
  return { ok: true, alreadyJoined: false };
}
