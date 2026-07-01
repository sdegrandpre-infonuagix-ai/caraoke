import { create } from 'zustand';
import { clearSession, loadSession, saveSession } from '../auth/secureStore';
import { isExpired } from '../auth/jwt';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  idToken: string | null;
  /** Restore a session from secure storage on app launch. */
  hydrate: () => Promise<void>;
  /** Persist a fresh session after a successful sign-in. */
  setSession: (idToken: string, refreshToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Session/auth client state (architecture: Zustand for client state). */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  idToken: null,

  hydrate: async () => {
    const session = await loadSession();
    if (session && !isExpired(session.idToken, Date.now())) {
      set({ status: 'signedIn', idToken: session.idToken });
    } else {
      if (session) await clearSession();
      set({ status: 'signedOut', idToken: null });
    }
  },

  setSession: async (idToken, refreshToken) => {
    await saveSession({ idToken, refreshToken });
    set({ status: 'signedIn', idToken });
  },

  signOut: async () => {
    await clearSession();
    set({ status: 'signedOut', idToken: null });
  },
}));
