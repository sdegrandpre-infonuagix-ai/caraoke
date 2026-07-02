import { AppError } from '@caraoke/shared';
import type { ResolvedTrack, SongRequestResult } from './agent.types.js';
import type { Session } from '../pairing/pairing.types.js';

/** Minimal slice of PairingService needed to confirm the caller is in the session. */
export interface SessionParticipantGuard {
  assertParticipant(sessionId: string, userId: string): Promise<Session>;
}

/** Port: resolves a free-text song query to a Spotify track. */
export interface TrackResolver {
  search(query: string): Promise<ResolvedTrack | null>;
}

/**
 * Port: schedules a synchronized playback start for all session participants.
 * Story 9.2 supplies the real AppSync-Events implementation.
 */
export interface ScheduledStartProducer {
  schedule(params: {
    sessionId: string;
    participantIds: string[];
    track: ResolvedTrack;
  }): Promise<{ scheduledAt: string }>;
}

/**
 * Placeholder producer used until Story 9.2 wires the real AppSync-Events publisher.
 * Returns a scheduledAt 5 seconds in the future so clients can prebuffer in time.
 */
export class NullScheduledStartProducer implements ScheduledStartProducer {
  async schedule(_params: { sessionId: string; participantIds: string[]; track: ResolvedTrack }) {
    return { scheduledAt: new Date(Date.now() + 5_000).toISOString() };
  }
}

/**
 * Coordinates a voice-agent song request end-to-end:
 *  1. Verifies the caller is a session participant (reuses PairingService.assertParticipant).
 *  2. Resolves the track via the Spotify search abstraction (SpotifySearchProvider).
 *  3. Hands off to the ScheduledStartProducer (Story 9.2 replaces NullScheduledStartProducer).
 */
export class AgentService {
  constructor(
    private readonly participantGuard: SessionParticipantGuard,
    private readonly trackResolver: TrackResolver,
    private readonly producer: ScheduledStartProducer,
  ) {}

  async handleSongRequest(
    sessionId: string,
    userId: string,
    query: string,
  ): Promise<SongRequestResult> {
    const session = await this.participantGuard.assertParticipant(sessionId, userId);

    const track = await this.trackResolver.search(query);
    if (!track) {
      throw new AppError('NOT_FOUND', `No tracks found for "${query}".`);
    }

    const participantIds = [session.hostUserId, session.guestUserId].filter(
      (id): id is string => id !== null,
    );

    const { scheduledAt } = await this.producer.schedule({ sessionId, participantIds, track });

    return { sessionId, track, scheduledAt };
  }
}
