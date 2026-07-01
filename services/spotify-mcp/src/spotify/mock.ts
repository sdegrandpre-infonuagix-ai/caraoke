import type { PlaybackState, SpotifyController } from './index.js';

/**
 * Sandbox controller (NFR20, AR9) — an in-memory playback state machine for offline dev and
 * deterministic CI. No network, no real Spotify, no audio.
 */
export class MockSpotifyController implements SpotifyController {
  readonly mode = 'mock' as const;
  private state: PlaybackState = { isPlaying: false, trackUri: null, positionMs: 0 };

  async play(_accessToken: string, trackUri: string, positionMs = 0): Promise<void> {
    this.state = { isPlaying: true, trackUri, positionMs };
  }

  async pause(_accessToken: string): Promise<void> {
    this.state = { ...this.state, isPlaying: false };
  }

  async resume(_accessToken: string): Promise<void> {
    if (this.state.trackUri) this.state = { ...this.state, isPlaying: true };
  }

  async getPlaybackState(_accessToken: string): Promise<PlaybackState> {
    return { ...this.state };
  }
}
