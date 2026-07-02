// Playback-position service (Story 9.4): samples the real Spotify playback position for a
// session participant. Used by the drift-correction loop on mobile — see useDriftCorrection.ts.

import { AppError } from '@caraoke/shared';
import type { SessionParticipantGuard } from './agent.service.js';
import type { SpotifyLinkRepository } from '../identity/spotify.repository.js';
import type { PlaybackPositionProvider } from '../../integrations/spotify/playback.js';

/** Port injected into createPlaybackRouter so tests can provide a lightweight stub. */
export interface PlaybackPositionService {
  /** Asserts participant membership, reads the stored refresh token, and samples Spotify. */
  getPosition(sessionId: string, userId: string): Promise<{ positionMs: number }>;
}

export class LivePlaybackPositionService implements PlaybackPositionService {
  constructor(
    private readonly participantGuard: SessionParticipantGuard,
    private readonly spotifyLinks: SpotifyLinkRepository,
    private readonly positionProvider: PlaybackPositionProvider,
  ) {}

  async getPosition(sessionId: string, userId: string): Promise<{ positionMs: number }> {
    await this.participantGuard.assertParticipant(sessionId, userId);

    const refreshToken = await this.spotifyLinks.findRefreshToken(userId);
    if (!refreshToken) {
      throw new AppError('FORBIDDEN', 'Spotify account not linked — cannot sample playback position.');
    }

    const positionMs = await this.positionProvider.getPosition(refreshToken);
    return { positionMs: positionMs ?? 0 };
  }
}
