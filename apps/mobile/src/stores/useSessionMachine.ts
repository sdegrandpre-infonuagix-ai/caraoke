import { create } from 'zustand';
import { canTransition, type SessionState } from '@caraoke/shared';

/**
 * Client SessionStateMachine (UX-DR2) — the single source of truth for the in-session
 * lifecycle. Both the visual layer (components) and the sonic layer (SonicEngine) subscribe to
 * this store, so feedback is always consistent. Transitions are validated against the shared
 * machine; invalid transitions are ignored (and reported via the return value).
 */
interface SessionMachine {
  state: SessionState;
  /** Attempt a transition; returns false (and no-ops) if it's not allowed. */
  transition: (to: SessionState) => boolean;
  /** Reset to idle (e.g. leaving a session). */
  reset: () => void;
}

export const useSessionMachine = create<SessionMachine>((set, get) => ({
  state: 'idle',
  transition: (to) => {
    const from = get().state;
    if (from === to) return true;
    if (!canTransition(from, to)) return false;
    set({ state: to });
    return true;
  },
  reset: () => set({ state: 'idle' }),
}));
