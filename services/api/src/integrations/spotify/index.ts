// Spotify integration abstraction (NFR20, AR9). The live Web-API adapter and a sandbox mock
// sit behind one interface; the identity module depends only on this interface. No module
// calls the Spotify SDK directly.

import type { Env } from '../../config/env.js';
import { LiveSpotifyProvider } from './live.js';
import { MockSpotifyProvider } from './mock.js';

export interface SpotifyProfile {
  spotifyUserId: string;
  displayName: string | null;
  /** Spotify product tier: 'premium' | 'free' | 'open'. */
  product: string;
  /** True only when product === 'premium' (duet participation requires it, FR2). */
  isPremium: boolean;
}

export interface SpotifyProvider {
  readonly mode: 'live' | 'mock';
  /** Fetch the authenticated user's profile (incl. product tier) from their access token. */
  getProfile(accessToken: string): Promise<SpotifyProfile>;
}

export function getSpotifyProvider(env: Env): SpotifyProvider {
  return env.CARAOKE_INTEGRATIONS === 'live'
    ? new LiveSpotifyProvider()
    : new MockSpotifyProvider();
}

export { LiveSpotifyProvider } from './live.js';
export { MockSpotifyProvider } from './mock.js';
