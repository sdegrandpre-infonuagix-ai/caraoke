// Secure token storage (UX/AC: "a valid session (JWT) is issued and stored securely").
// Backed by the platform keychain/keystore via expo-secure-store.
import * as SecureStore from 'expo-secure-store';

const ID_TOKEN_KEY = 'caraoke.idToken';
const REFRESH_TOKEN_KEY = 'caraoke.refreshToken';

export interface StoredSession {
  idToken: string;
  refreshToken?: string;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(ID_TOKEN_KEY, session.idToken);
  if (session.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);
  if (!idToken) return null;
  const refreshToken = (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? undefined;
  return { idToken, refreshToken };
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
