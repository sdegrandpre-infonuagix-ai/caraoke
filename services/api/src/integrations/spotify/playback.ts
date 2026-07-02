// Spotify playback-position integration (Story 9.4, FR20/NFR2).
// Follows the port/adapter pattern (NFR20): modules depend only on PlaybackPositionProvider;
// the live adapter exchanges the user's stored refresh token for a fresh access token and
// calls GET /v1/me/player. The mock returns a deterministic position for unit tests.

import { AppError } from '@caraoke/shared';
import type { Env } from '../../config/env.js';

/** Port: sample the real Spotify playback position for a user. */
export interface PlaybackPositionProvider {
  readonly mode: 'live' | 'mock';
  /** Returns progress_ms, or null when no Spotify device is active. */
  getPosition(refreshToken: string): Promise<number | null>;
}

/**
 * Live adapter: exchanges the stored OAuth refresh token for a short-lived access token,
 * then calls GET /v1/me/player and returns progress_ms.
 */
export class LivePlaybackPositionProvider implements PlaybackPositionProvider {
  readonly mode = 'live' as const;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async getPosition(refreshToken: string): Promise<number | null> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
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

    if (!tokenRes.ok) {
      throw new AppError('INTERNAL', `Spotify token refresh failed: ${tokenRes.status}`);
    }

    const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string };

    const playerRes = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (playerRes.status === 204) return null; // No active Spotify device.
    if (!playerRes.ok) {
      throw new AppError('INTERNAL', `Spotify player fetch failed: ${playerRes.status}`);
    }

    const body = (await playerRes.json()) as { progress_ms: number | null };
    return body.progress_ms ?? null;
  }
}

/** Deterministic mock — always returns the configured position (default: 3 000 ms). */
export class MockPlaybackPositionProvider implements PlaybackPositionProvider {
  readonly mode = 'mock' as const;

  constructor(private readonly positionMs: number = 3_000) {}

  async getPosition(_refreshToken: string): Promise<number | null> {
    return this.positionMs;
  }
}

export function getPlaybackPositionProvider(env: Env): PlaybackPositionProvider {
  if (env.CARAOKE_INTEGRATIONS === 'live') {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new Error(
        'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET required for live playback position sampling.',
      );
    }
    return new LivePlaybackPositionProvider(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
  }
  return new MockPlaybackPositionProvider();
}
