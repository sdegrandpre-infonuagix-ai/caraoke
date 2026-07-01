// Failure-ladder state machine (Story 4.3, UX-DR9). Pure and side-effect-free so it can be
// unit-tested without a React environment. The hook (`useRiffAgent`) drives it imperatively.

/**
 * Rungs of the misrecognition failure ladder (UX-DR9).
 * - `listening`  → hot window open, awaiting transcript
 * - `processing` → transcript sent, awaiting AgentResponse
 * - `confirming` → Riff spoke the confirmation; awaiting binary yes/no
 * - `clarifying` → two binary choices presented; awaiting selection
 * - `re_asking`  → first failure; Riff asks to repeat more clearly
 * - `exiting`    → failure limit reached; graceful exit
 * - `done`       → song confirmed and queued
 */
export type LadderRung =
  | 'listening'
  | 'processing'
  | 'confirming'
  | 'clarifying'
  | 're_asking'
  | 'exiting'
  | 'done';

export interface LadderState {
  rung: LadderRung;
  /** Number of consecutive misrecognition steps (re_ask / failed confirms). */
  misses: number;
  /** Track pending confirmation (set in `confirming`). */
  pendingTrackId: string | null;
  pendingTrackUri: string | null;
}

/** UX-DR9: after this many consecutive misses the ladder exits gracefully. */
export const MAX_MISSES = 3;

export function initialLadder(): LadderState {
  return { rung: 'listening', misses: 0, pendingTrackId: null, pendingTrackUri: null };
}

/** Advance the ladder based on the action returned by the agent. */
export function advanceLadder(state: LadderState, action: string, trackId?: string, trackUri?: string): LadderState {
  switch (action) {
    case 'confirm':
      return {
        ...state,
        rung: 'confirming',
        misses: 0,
        pendingTrackId: trackId ?? null,
        pendingTrackUri: trackUri ?? null,
      };
    case 'clarify':
      return { ...state, rung: 'clarifying', misses: 0, pendingTrackId: null, pendingTrackUri: null };
    case 're_ask': {
      const nextMisses = state.misses + 1;
      return {
        ...state,
        rung: nextMisses >= MAX_MISSES ? 'exiting' : 're_asking',
        misses: nextMisses,
        pendingTrackId: null,
        pendingTrackUri: null,
      };
    }
    case 'exit':
      return { ...state, rung: 'exiting', pendingTrackId: null, pendingTrackUri: null };
    default:
      return state;
  }
}

/** User said "yes" to the pending confirmation. */
export function confirmLadder(state: LadderState): LadderState {
  return { ...state, rung: 'done' };
}

/**
 * User said "no" or gave a non-yes response to the confirmation prompt.
 * Increment the miss count; if at the limit, exit gracefully.
 */
export function rejectLadder(state: LadderState): LadderState {
  const nextMisses = state.misses + 1;
  return {
    ...state,
    rung: nextMisses >= MAX_MISSES ? 'exiting' : 'listening',
    misses: nextMisses,
    pendingTrackId: null,
    pendingTrackUri: null,
  };
}

/** True when the ladder is in a terminal state (no further input expected). */
export function isTerminal(state: LadderState): boolean {
  return state.rung === 'done' || state.rung === 'exiting';
}
