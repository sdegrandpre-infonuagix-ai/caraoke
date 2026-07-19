import { AppError } from '@caraoke/shared';
import type { ResolvedTrack, SongRequestResult, StartConfirmResult } from './agent.types.js';
import type { Session } from '../pairing/pairing.types.js';
import type { EventPublisher } from '../../events/index.js';
import type { StartCoordinator } from './startCoordinator.js';

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
 * Coordinates a voice-agent song request end-to-end, gated by a mutual "Start singing" step so
 * the host can never start playback alone:
 *  1. handleSongRequest — the host picks a song: verify participant, resolve the track, record the
 *     proposal, and broadcast `song.proposed` so both phones show it. Playback is NOT scheduled.
 *  2. confirmStart — each participant taps "Start singing": once ALL have confirmed, hand off to
 *     the ScheduledStartProducer (publishes `playback.scheduled`); otherwise broadcast progress.
 */
export class AgentService {
  constructor(
    private readonly participantGuard: SessionParticipantGuard,
    private readonly trackResolver: TrackResolver,
    private readonly producer: ScheduledStartProducer,
    private readonly publisher: EventPublisher,
    private readonly coordinator: StartCoordinator,
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

    // Record the pick and tell both phones — but do NOT schedule playback yet. Both participants
    // must confirm via confirmStart() first (the "Start singing" gate).
    this.coordinator.propose(sessionId, participantIds, track);
    const proposedAt = new Date().toISOString();
    await this.publisher.publish({
      type: 'song.proposed',
      version: 1,
      sessionId,
      occurredAt: proposedAt,
      data: {
        trackId: track.trackId,
        trackUri: track.uri,
        trackName: track.name,
        artist: track.artist,
        durationMs: track.durationMs,
        proposedBy: userId,
        participantIds,
      },
    });

    return { sessionId, track, proposedAt };
  }

  async confirmStart(sessionId: string, userId: string): Promise<StartConfirmResult> {
    await this.participantGuard.assertParticipant(sessionId, userId);

    const outcome = this.coordinator.confirm(sessionId, userId);
    if (outcome.status === 'no_proposal') {
      throw new AppError('NOT_FOUND', 'No song is queued to start — ask the host to pick a song.');
    }

    if (outcome.status === 'ready') {
      // Everyone confirmed → schedule the synchronized start exactly once.
      const { scheduledAt } = await this.producer.schedule({
        sessionId,
        participantIds: outcome.participantIds,
        track: outcome.track,
      });
      this.coordinator.clear(sessionId);
      return {
        status: 'scheduled',
        scheduledAt,
        confirmedCount: outcome.confirmedCount,
        participantCount: outcome.participantCount,
      };
    }

    // Still waiting on the other participant — broadcast progress so their phone can reflect it.
    await this.publisher.publish({
      type: 'start.confirmed',
      version: 1,
      sessionId,
      occurredAt: new Date().toISOString(),
      data: {
        userId,
        confirmedCount: outcome.confirmedCount,
        participantCount: outcome.participantCount,
      },
    });
    return {
      status: 'waiting',
      confirmedCount: outcome.confirmedCount,
      participantCount: outcome.participantCount,
    };
  }
}
