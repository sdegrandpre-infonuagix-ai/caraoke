// Spotify integration abstraction (NFR20, AR9). The live Web-API adapter and a sandbox mock
// sit behind one interface; the MCP tools depend only on this interface.
//
// NFR21 INVARIANT: this controller ONLY issues Spotify Web API *control* calls (play/pause on
// the user's own device). It never fetches, proxies, or re-streams audio. The song always
// plays from each user's own Spotify Premium app — never peer-to-peer through Caraoke.

export interface PlaybackState {
  isPlaying: boolean;
  trackUri: string | null;
  positionMs: number;
}

export interface SpotifyController {
  readonly mode: 'live' | 'mock';
  /** Start (or restart) a track from `positionMs` on the user's active device. */
  play(accessToken: string, trackUri: string, positionMs?: number): Promise<void>;
  pause(accessToken: string): Promise<void>;
  resume(accessToken: string): Promise<void>;
  getPlaybackState(accessToken: string): Promise<PlaybackState>;
}

export { LiveSpotifyController } from './live.js';
export { MockSpotifyController } from './mock.js';
