// Holds the PKCE verifier + state across the OAuth browser round-trip.
//
// The OAuth return comes back as an HTTPS App Link that Expo Router routes to a callback
// SCREEN (app/auth/callback, app/spotify/callback) — a different component than the hook that
// started the flow. So the code_verifier can't live in the hook's closure; it lives here.
// Module scope is sufficient: the app process stays alive during the in-app auth tab.

export interface PendingAuth {
  codeVerifier: string;
  state: string;
}

let cognitoPending: PendingAuth | null = null;
let spotifyPending: PendingAuth | null = null;

export function setCognitoPending(p: PendingAuth): void {
  cognitoPending = p;
}

/** Return the pending Cognito auth and clear it (single-use — the code is one-time). */
export function takeCognitoPending(): PendingAuth | null {
  const p = cognitoPending;
  cognitoPending = null;
  return p;
}

export function setSpotifyPending(p: PendingAuth): void {
  spotifyPending = p;
}

export function takeSpotifyPending(): PendingAuth | null {
  const p = spotifyPending;
  spotifyPending = null;
  return p;
}
