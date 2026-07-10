import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import { clearSession, loadSession, saveSession } from '../auth/secureStore';
import { authConfig } from '../auth/config';
import { isExpired } from '../auth/jwt';

const SIGN_OUT_URI = 'caraoke://signout';

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
    // End the Cognito hosted-UI session too — otherwise its cookie survives and the next
    // "Continue with Google" silently reuses it (no account chooser). Best-effort: whatever
    // happens with the web session, always clear the local session.
    try {
      if (authConfig.domain && authConfig.clientId) {
        const url =
          `https://${authConfig.domain}/logout?client_id=${authConfig.clientId}` +
          `&logout_uri=${encodeURIComponent(SIGN_OUT_URI)}`;
        await WebBrowser.openAuthSessionAsync(url, SIGN_OUT_URI);
      }
    } catch {
      // ignore — fall through to clearing the local session
    }
    await clearSession();
    set({ status: 'signedOut', idToken: null });
  },
}));
