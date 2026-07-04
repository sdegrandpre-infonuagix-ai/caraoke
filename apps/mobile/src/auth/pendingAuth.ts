// Holds the PKCE verifier + state across the OAuth browser round-trip.
//
// The OAuth return comes back as a caraoke:// deep link that Expo Router routes to a callback
// SCREEN (app/auth/callback, app/spotify/callback) — a different component than the hook that
// started the flow. Worse, the deep link can cold-start a fresh app process, wiping module
// memory. So the verifier is kept in memory (fast path) AND mirrored to the secure store, and
// `take` falls back to the store when memory was lost. Single-use: taking clears both.
import * as SecureStore from 'expo-secure-store';

export interface PendingAuth {
  codeVerifier: string;
  state: string;
}

const COGNITO_KEY = 'caraoke.pending.cognito';
const SPOTIFY_KEY = 'caraoke.pending.spotify';

let cognitoPending: PendingAuth | null = null;
let spotifyPending: PendingAuth | null = null;

async function persist(key: string, p: PendingAuth): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(p));
  } catch {
    // Memory copy still covers the same-process path.
  }
}

async function take(key: string, mem: PendingAuth | null): Promise<PendingAuth | null> {
  let p = mem;
  if (!p) {
    try {
      const raw = await SecureStore.getItemAsync(key);
      if (raw) p = JSON.parse(raw) as PendingAuth;
    } catch {
      p = null;
    }
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
  return p;
}

export async function setCognitoPending(p: PendingAuth): Promise<void> {
  cognitoPending = p;
  await persist(COGNITO_KEY, p);
}

/** Return the pending Cognito auth and clear it (single-use — the code is one-time). */
export async function takeCognitoPending(): Promise<PendingAuth | null> {
  const p = await take(COGNITO_KEY, cognitoPending);
  cognitoPending = null;
  return p;
}

export async function setSpotifyPending(p: PendingAuth): Promise<void> {
  spotifyPending = p;
  await persist(SPOTIFY_KEY, p);
}

export async function takeSpotifyPending(): Promise<PendingAuth | null> {
  const p = await take(SPOTIFY_KEY, spotifyPending);
  spotifyPending = null;
  return p;
}
