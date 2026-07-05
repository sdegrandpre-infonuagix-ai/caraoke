// Playback control service (Story 4.4/4.6, FR14/FR18/FR21). Turns participant-scoped control
// requests into Spotify commands against each user's own client. Per-caller ops (prebuffer/play/
// seek) act on the caller's Spotify; shared ops (pause/resume/stop) act on BOTH participants.

import { AppError } from '@caraoke/shared';
import type { SessionParticipantGuard } from './agent.service.js';
import type { SpotifyLinkRepository } from '../identity/spotify.repository.js';
import type { PlaybackController } from '../../integrations/spotify/playbackControl.js';

export interface PlaybackControlService {
  prebuffer(sessionId: string, userId: string, trackUri: string): Promise<void>;
  play(sessionId: string, userId: string): Promise<void>;
  seek(sessionId: string, userId: string, positionMs: number): Promise<void>;
  pauseBoth(sessionId: string, userId: string): Promise<void>;
  resumeBoth(sessionId: string, userId: string): Promise<void>;
  stop(sessionId: string, userId: string): Promise<void>;
}

export class LivePlaybackControlService implements PlaybackControlService {
  constructor(
    private readonly participantGuard: SessionParticipantGuard,
    private readonly spotifyLinks: SpotifyLinkRepository,
    private readonly controller: PlaybackController,
  ) {}

  /** Assert membership and return the caller's Spotify refresh token. */
  private async callerToken(sessionId: string, userId: string): Promise<string> {
    await this.participantGuard.assertParticipant(sessionId, userId);
    const token = await this.spotifyLinks.findRefreshToken(userId);
    if (!token) throw new AppError('FORBIDDEN', 'Spotify account not linked — cannot control playback.');
    return token;
  }

  /** Assert membership and return refresh tokens for every linked participant. */
  private async participantTokens(sessionId: string, userId: string): Promise<string[]> {
    const session = await this.participantGuard.assertParticipant(sessionId, userId);
    const ids = [session.hostUserId, session.guestUserId].filter((id): id is string => id !== null);
    const tokens = await Promise.all(ids.map((id) => this.spotifyLinks.findRefreshToken(id)));
    return tokens.filter((t): t is string => t !== null);
  }

  async prebuffer(sessionId: string, userId: string, trackUri: string): Promise<void> {
    await this.controller.prepare(await this.callerToken(sessionId, userId), trackUri);
  }

  async play(sessionId: string, userId: string): Promise<void> {
    await this.controller.resume(await this.callerToken(sessionId, userId));
  }

  async seek(sessionId: string, userId: string, positionMs: number): Promise<void> {
    await this.controller.seek(await this.callerToken(sessionId, userId), positionMs);
  }

  async pauseBoth(sessionId: string, userId: string): Promise<void> {
    const tokens = await this.participantTokens(sessionId, userId);
    // Best-effort: one participant lacking an active device shouldn't block the other's pause.
    await Promise.allSettled(tokens.map((t) => this.controller.pause(t)));
  }

  async resumeBoth(sessionId: string, userId: string): Promise<void> {
    const tokens = await this.participantTokens(sessionId, userId);
    await Promise.allSettled(tokens.map((t) => this.controller.resume(t)));
  }

  async stop(sessionId: string, userId: string): Promise<void> {
    // Stopping the session = pause both clients; the client transitions the session to 'ended'.
    await this.pauseBoth(sessionId, userId);
  }
}
