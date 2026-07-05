import { create } from 'zustand';

/**
 * Who the current user is in the active session: the 'host' (created + invited) or the 'guest'
 * (joined via code/link). Set at create/join time and read on the singing screen so only the
 * host drives song selection — the guest sings along.
 */
export type SessionRole = 'host' | 'guest' | null;

interface SessionRoleStore {
  role: SessionRole;
  setRole: (role: SessionRole) => void;
  reset: () => void;
}

export const useSessionRole = create<SessionRoleStore>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
  reset: () => set({ role: null }),
}));
