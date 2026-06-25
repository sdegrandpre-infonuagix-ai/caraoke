import { AppError } from '@caraoke/shared';
import type { SpotifyProfile, SpotifyProvider } from './index.js';

/** Live adapter: reads the user's profile + product tier from the Spotify Web API. */
export class LiveSpotifyProvider implements SpotifyProvider {
  readonly mode = 'live' as const;

  async getProfile(accessToken: string): Promise<SpotifyProfile> {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      throw new AppError('UNAUTHORIZED', 'Spotify token is invalid or expired.');
    }
    if (!res.ok) {
      throw new AppError('INTERNAL', `Spotify profile fetch failed: ${res.status}`);
    }
    const body = (await res.json()) as {
      id: string;
      display_name?: string | null;
      product?: string;
    };
    const product = body.product ?? 'open';
    return {
      spotifyUserId: body.id,
      displayName: body.display_name ?? null,
      product,
      isPremium: product === 'premium',
    };
  }
}
