// Spotify playback CONTROL integration (Story 4.4/4.6, FR14/FR18/FR21). Commands each user's
// own Spotify client via the Web API using their stored OAuth refresh token. Follows the
// port/adapter pattern: services depend only on PlaybackController; the live adapter talks to
// Spotify, the mock no-ops for tests/offline.
//
// NOTE (road-test reality): the Spotify Web API can only drive an ACTIVE device — the user's
// Spotify app must be open and have been the active playback device at least once. A dead device
// returns 404; we surface that as a clear, actionable error.

import { AppError } from '@caraoke/shared';
import type { Env } from '../../config/env.js';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export interface PlaybackController {
  readonly mode: 'live' | 'mock';
  /** Load a track and leave it paused near position 0 (prebuffer for a synchronized start). */
  prepare(refreshToken: string, trackUri: string): Promise<void>;
  /** Start a SPECIFIC track at an absolute position — the authoritative synchronized start. */
  start(refreshToken: string, trackUri: string, positionMs: number): Promise<void>;
  /** Resume playback of the currently-loaded track (shared pause/resume controls). */
  resume(refreshToken: string): Promise<void>;
  /** Pause playback. */
  pause(refreshToken: string): Promise<void>;
  /** Seek to an absolute position (used by drift correction). */
  seek(refreshToken: string, positionMs: number): Promise<void>;
}

export class LivePlaybackController implements PlaybackController {
  readonly mode = 'live' as const;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private async accessToken(refreshToken: string): Promise<string> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) throw new AppError('INTERNAL', `Spotify token refresh failed: ${res.status}`);
    const { access_token: accessToken } = (await res.json()) as { access_token: string };
    return accessToken;
  }

  private async command(accessToken: string, method: string, path: string, body?: unknown): Promise<void> {
    const res = await fetch(`${SPOTIFY_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) {
      throw new AppError(
        'CONFLICT',
        'No active Spotify device. Open Spotify on your phone and play any song once, then try again.',
      );
    }
    if (res.status === 403) {
      throw new AppError(
        'FORBIDDEN',
        'Spotify refused playback control — Premium is required and the app must be the active device.',
      );
    }
    // 200/202/204 are the documented success codes for player commands.
    if (![200, 202, 204].includes(res.status)) {
      throw new AppError('INTERNAL', `Spotify playback command failed: ${res.status}`);
    }
  }

  async prepare(refreshToken: string, trackUri: string): Promise<void> {
    const token = await this.accessToken(refreshToken);
    // Start the track, then immediately pause so both clients sit ready at ~0 until T.
    await this.command(token, 'PUT', '/me/player/play', { uris: [trackUri] });
    await this.command(token, 'PUT', '/me/player/pause');
  }

  async start(refreshToken: string, trackUri: string, positionMs: number): Promise<void> {
    const token = await this.accessToken(refreshToken);
    // Authoritative start: play THIS track from the shared position, regardless of what was
    // loaded/playing before. position_ms lets a slightly-late device catch up to the shared T.
    await this.command(token, 'PUT', '/me/player/play', {
      uris: [trackUri],
      position_ms: Math.max(0, Math.round(positionMs)),
    });
  }

  async resume(refreshToken: string): Promise<void> {
    const token = await this.accessToken(refreshToken);
    await this.command(token, 'PUT', '/me/player/play');
  }

  async pause(refreshToken: string): Promise<void> {
    const token = await this.accessToken(refreshToken);
    await this.command(token, 'PUT', '/me/player/pause');
  }

  async seek(refreshToken: string, positionMs: number): Promise<void> {
    const token = await this.accessToken(refreshToken);
    await this.command(token, 'PUT', `/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`);
  }
}

/** No-op controller for tests / mock integrations mode. */
export class MockPlaybackController implements PlaybackController {
  readonly mode = 'mock' as const;
  async prepare(): Promise<void> {}
  async start(): Promise<void> {}
  async resume(): Promise<void> {}
  async pause(): Promise<void> {}
  async seek(): Promise<void> {}
}

export function getPlaybackController(env: Env): PlaybackController {
  if (env.CARAOKE_INTEGRATIONS === 'live') {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET required for live playback control.');
    }
    return new LivePlaybackController(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
  }
  return new MockPlaybackController();
}
