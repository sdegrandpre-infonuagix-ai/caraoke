import { AppError, canTransition, type SessionState } from '@caraoke/shared';
import type { Session } from './pairing.types.js';

export type ParticipantRole = 'host' | 'guest';

export interface ReadyDecision {
  role: ParticipantRole;
  hostReady: boolean;
  guestReady: boolean;
  bothReady: boolean;
  nextStatus: SessionState;
  /** True when this readiness completes the handshake (pairing → ready). */
  transitioned: boolean;
}

/** Public readiness view returned to clients and carried in the event. */
export interface ReadyState {
  sessionId: string;
  status: SessionState;
  hostReady: boolean;
  guestReady: boolean;
  bothReady: boolean;
}

/**
 * Pure ready-handshake decision (FR10, UX-DR2). Given the current session and who is marking
 * ready, compute the new readiness flags and the next state. The SessionStateMachine is the
 * single source of truth: pairing → ready only when BOTH are ready, validated by
 * `canTransition`. Throws on non-participants or an already-ended session.
 */
export function decideReady(session: Session, userId: string): ReadyDecision {
  let role: ParticipantRole;
  if (session.hostUserId === userId) role = 'host';
  else if (session.guestUserId === userId) role = 'guest';
  else throw new AppError('FORBIDDEN', 'You are not part of this session.');

  if (session.status === 'ended') {
    throw new AppError('CONFLICT', 'This session has ended.');
  }

  const hostReady = session.hostReady || role === 'host';
  const guestReady = session.guestReady || role === 'guest';
  // Both-ready requires an actual partner present.
  const bothReady = hostReady && guestReady && session.guestUserId != null;

  let nextStatus: SessionState = session.status;
  let transitioned = false;
  if (bothReady && session.status === 'pairing') {
    if (!canTransition('pairing', 'ready')) {
      throw new AppError('CONFLICT', 'Cannot become ready from the current state.');
    }
    nextStatus = 'ready';
    transitioned = true;
  }

  return { role, hostReady, guestReady, bothReady, nextStatus, transitioned };
}

export function toReadyState(sessionId: string, d: Pick<ReadyDecision, 'hostReady' | 'guestReady' | 'bothReady' | 'nextStatus'>): ReadyState {
  return {
    sessionId,
    status: d.nextStatus,
    hostReady: d.hostReady,
    guestReady: d.guestReady,
    bothReady: d.bothReady,
  };
}
