import { z } from 'zod';

/**
 * In-session lifecycle state machine (architecture: Communication Patterns).
 * `idle → pairing → ready → playing → reconnecting → ended`.
 * The SessionStateMachine is the single source of truth (UX-DR2).
 */
export const SESSION_STATES = [
  'idle',
  'pairing',
  'ready',
  'playing',
  'reconnecting',
  'ended',
] as const;

export type SessionState = (typeof SESSION_STATES)[number];

/** Allowed forward transitions between session states. */
export const SESSION_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  idle: ['pairing'],
  pairing: ['ready', 'ended'],
  ready: ['playing', 'ended'],
  playing: ['reconnecting', 'ended'],
  reconnecting: ['playing', 'ended'],
  ended: [],
};

export function canTransition(from: SessionState, to: SessionState): boolean {
  return SESSION_TRANSITIONS[from].includes(to);
}

export const sessionStateSchema = z.enum(SESSION_STATES);
