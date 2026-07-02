// Spotify track-search abstraction (Story 9.1, NFR20).
// Used by the agent module to resolve a free-text song query to a Spotify track.
// The live adapter uses the Spotify Web API with app-level Client Credentials; the mock
// returns a deterministic track so the agent endpoint works without Spotify credentials.

import { AppError } from '@caraoke/shared';
import type { Env } from '../../config/env.js';

/** A Spotify track resolved from a free-text query (mirrors the MCP server's track shape). */
export interface ResolvedTrack {
  trackId: string;
  name: string;
  artist: string;
  /** Spotify URI in the form spotify:track:{id}. */
  uri: string;
  durationMs: number;
}

export interface SpotifySearchProvider {
  readonly mode: 'live' | 'mock';
  search(query: string): Promise<ResolvedTrack | null>;
}

// ---------------------------------------------------------------------------
// Live adapter — Client Credentials flow
// ---------------------------------------------------------------------------

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export class LiveSpotifySearchProvider implements SpotifySearchProvider {
  readonly mode = 'live' as const;
  private cached: CachedToken | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async search(query: string): Promise<ResolvedTrack | null> {
    const token = await this.getToken();
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) throw new AppError('INTERNAL', 'Spotify app token rejected.');
    if (!res.ok) throw new AppError('INTERNAL', `Spotify search failed: ${res.status}`);

    const body = (await res.json()) as {
      tracks?: {
        items?: Array<{
          id: string;
          name: string;
          duration_ms: number;
          uri: string;
          artists?: Array<{ name: string }>;
        }>;
      };
    };

    const item = body.tracks?.items?.[0];
    if (!item) return null;

    return {
      trackId: item.id,
      name: item.name,
      artist: item.artists?.[0]?.name ?? 'Unknown',
      uri: item.uri,
      durationMs: item.duration_ms,
    };
  }

  private async getToken(): Promise<string> {
    if (this.cached && Date.now() < this.cached.expiresAt - 30_000) {
      return this.cached.accessToken;
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new AppError('INTERNAL', `Spotify token fetch failed: ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.cached = {
      accessToken: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1_000,
    };
    return this.cached.accessToken;
  }
}

// ---------------------------------------------------------------------------
// Mock adapter — deterministic, no network (NFR20)
// ---------------------------------------------------------------------------

export class MockSpotifySearchProvider implements SpotifySearchProvider {
  readonly mode = 'mock' as const;

  async search(query: string): Promise<ResolvedTrack | null> {
    if (query.toLowerCase().includes('__not_found__')) return null;
    const slug = query.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
    return {
      trackId: `mock-track-${slug}`,
      name: query,
      artist: 'Mock Artist',
      uri: `spotify:track:mock-track-${slug}`,
      durationMs: 210_000,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getSpotifySearchProvider(env: Env): SpotifySearchProvider {
  if (env.CARAOKE_INTEGRATIONS === 'live') {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new Error(
        'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required in live integrations mode.',
      );
    }
    return new LiveSpotifySearchProvider(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
  }
  return new MockSpotifySearchProvider();
}
