import type { SpotifyProvider } from '../../integrations/spotify/index.js';
import type { SpotifyLinkRepository } from './spotify.repository.js';
import { toStatus, type SpotifyLinkStatus } from './spotify.types.js';

/**
 * Spotify link + Premium verification (FR2). The provider is the only path to Spotify
 * (NFR20). Premium is verified via the provider, never assumed: a non-Premium account is
 * stored as linked-but-not-premium so the UI can tell the user plainly and offer an upgrade
 * path — it is never silently accepted as Premium.
 */
export class SpotifyService {
  constructor(
    private readonly provider: SpotifyProvider,
    private readonly links: SpotifyLinkRepository,
  ) {}

  async link(
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<SpotifyLinkStatus> {
    const profile = await this.provider.getProfile(accessToken);
    const link = await this.links.upsert({
      userId,
      spotifyUserId: profile.spotifyUserId,
      product: profile.product,
      isPremium: profile.isPremium,
      displayName: profile.displayName,
      refreshToken: refreshToken ?? null,
    });
    return toStatus(link);
  }

  async getStatus(userId: string): Promise<SpotifyLinkStatus> {
    return toStatus(await this.links.findByUserId(userId));
  }
}
