import type { SpotifyProfile, SpotifyProvider } from './index.js';

/**
 * Sandbox provider (NFR20, AR9) — deterministic, no network. Premium by default; a token
 * containing "free" yields a free account so the non-Premium path is testable offline.
 */
export class MockSpotifyProvider implements SpotifyProvider {
  readonly mode = 'mock' as const;

  async getProfile(accessToken: string): Promise<SpotifyProfile> {
    const isFree = accessToken.includes('free');
    const product = isFree ? 'free' : 'premium';
    return {
      spotifyUserId: `mock-${isFree ? 'free' : 'premium'}-user`,
      displayName: 'Mock Spotify User',
      product,
      isPremium: product === 'premium',
    };
  }
}
