import type { PlaybackState, SpotifyController } from './index.js';

const API = 'https://api.spotify.com/v1';

/**
 * Live Spotify Web API adapter. Control-plane only (play/pause/resume/state) — never audio
 * (NFR21). The user `accessToken` is passed per call; OAuth/refresh is handled upstream
 * (Story 2.4) using the app credentials sourced from Secrets Manager.
 */
export class LiveSpotifyController implements SpotifyController {
  readonly mode = 'live' as const;

  private headers(accessToken: string): Record<string, string> {
    return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  }

  private async expectOk(res: Response, action: string): Promise<void> {
    // Spotify returns 204 No Content for successful player commands.
    if (!res.ok && res.status !== 204) {
      throw new Error(`Spotify ${action} failed: ${res.status} ${await res.text()}`);
    }
  }

  async play(accessToken: string, trackUri: string, positionMs = 0): Promise<void> {
    const res = await fetch(`${API}/me/player/play`, {
      method: 'PUT',
      headers: this.headers(accessToken),
      body: JSON.stringify({ uris: [trackUri], position_ms: positionMs }),
    });
    await this.expectOk(res, 'play');
  }

  async pause(accessToken: string): Promise<void> {
    const res = await fetch(`${API}/me/player/pause`, {
      method: 'PUT',
      headers: this.headers(accessToken),
    });
    await this.expectOk(res, 'pause');
  }

  async resume(accessToken: string): Promise<void> {
    const res = await fetch(`${API}/me/player/play`, {
      method: 'PUT',
      headers: this.headers(accessToken),
    });
    await this.expectOk(res, 'resume');
  }

  async getPlaybackState(accessToken: string): Promise<PlaybackState> {
    const res = await fetch(`${API}/me/player`, { headers: this.headers(accessToken) });
    if (res.status === 204 || !res.ok) {
      return { isPlaying: false, trackUri: null, positionMs: 0 };
    }
    const body = (await res.json()) as {
      is_playing?: boolean;
      progress_ms?: number;
      item?: { uri?: string };
    };
    return {
      isPlaying: body.is_playing ?? false,
      trackUri: body.item?.uri ?? null,
      positionMs: body.progress_ms ?? 0,
    };
  }
}
