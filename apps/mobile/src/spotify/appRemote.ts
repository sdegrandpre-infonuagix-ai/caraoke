// On-device Spotify playback via the App Remote SDK (@wwdrew/expo-spotify-sdk). Controls the
// phone's own Spotify app directly over IPC — no Web-API "active device" requirement, which was
// the source of the NO_ACTIVE_DEVICE / wrong-device failures. Each phone plays its own copy of
// the track; the synchronized start time still comes from the backend's playback.scheduled event.
//
// Requires: Spotify app installed + logged in, Premium, and the app registered in the Spotify
// dashboard (redirect caraoke://spotify-auth, iOS bundle id, Android package + SHA-1).

import { Auth, AppRemote, Player, SpotifyURI, type SpotifySession } from '@wwdrew/expo-spotify-sdk';

// app-remote-control is what the App Remote connection needs; the playback-state scopes let us
// read/modify the player.
const SCOPES = [
  'app-remote-control',
  'user-modify-playback-state',
  'user-read-playback-state',
] as const;

let session: SpotifySession | null = null;
let connectPromise: Promise<void> | null = null;

/** Authenticate once (opens the Spotify app to authorize) and cache the session. */
async function getSession(): Promise<SpotifySession> {
  if (session) return session;
  session = await Auth.authenticate({ scopes: [...SCOPES] });
  return session;
}

/** Ensure the App Remote IPC connection to the local Spotify app is open (idempotent). */
export async function connectSpotify(): Promise<void> {
  if (AppRemote.isConnected()) return;
  if (!connectPromise) {
    connectPromise = (async () => {
      const s = await getSession();
      await AppRemote.connect(s.accessToken);
    })().finally(() => {
      connectPromise = null;
    });
  }
  return connectPromise;
}

/**
 * Play a specific track from a position — the synchronized start. If already connected, use the
 * fast Player.play; otherwise authorizeAndPlay wakes Spotify (launching if suspended) and plays.
 */
export async function playTrackOnDevice(trackUri: string, positionMs: number): Promise<void> {
  const uri = SpotifyURI.from(trackUri);
  if (AppRemote.isConnected()) {
    await Player.play(uri);
  } else {
    const s = await getSession();
    await AppRemote.authorizeAndPlay(s.accessToken, uri);
  }
  if (positionMs > 0) {
    await Player.seekTo(Math.round(positionMs));
  }
}

export async function pauseOnDevice(): Promise<void> {
  if (AppRemote.isConnected()) await Player.pause();
}

export async function resumeOnDevice(): Promise<void> {
  if (AppRemote.isConnected()) await Player.resume();
}

export async function seekOnDevice(positionMs: number): Promise<void> {
  if (AppRemote.isConnected()) await Player.seekTo(Math.max(0, Math.round(positionMs)));
}

export async function disconnectSpotify(): Promise<void> {
  session = null;
  if (AppRemote.isConnected()) await AppRemote.disconnect();
}
