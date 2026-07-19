import { create } from 'zustand';
import { Platform } from 'react-native';
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
    // Clear the LOCAL session first so the app signs out instantly and reliably — never trapped
    // signed-in by a stalling web session.
    await clearSession();
    set({ status: 'signedOut', idToken: null });

    // iOS signs in with an ephemeral web session (see useCognitoSignIn), so there's no shared
    // Cognito cookie to clear — a local clear is a complete sign-out. On Android (Chrome Custom
    // Tabs share cookies), best-effort end the hosted-UI session so the next sign-in prompts for
    // an account. Fire-and-forget: don't block or trap the UI on it.
    if (Platform.OS === 'android' && authConfig.domain && authConfig.clientId) {
      const url =
        `https://${authConfig.domain}/logout?client_id=${authConfig.clientId}` +
        `&logout_uri=${encodeURIComponent(SIGN_OUT_URI)}`;
      void WebBrowser.openAuthSessionAsync(url, SIGN_OUT_URI).catch(() => {});
    }
  },
}));
