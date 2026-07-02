// Story 9.2: playback.scheduled event producer.
// Resolves the "both phones wait forever" defect: the mobile useScheduledStart hook consumes
// a `playback.scheduled` event that previously had no server-side producer.

import type { EventPublisher } from '../../events/index.js';
import type { ScheduledStartProducer } from './agent.service.js';
import type { ResolvedTrack } from './agent.types.js';

/** Minimum lead time in ms before the scheduled start timestamp T.
 *  Must be long enough for both clients to call Spotify SDK's prefetch/queue before T. */
export const MIN_PREBUFFER_MS = 1_000;

/** Default: 2 seconds. Comfortably covers Spotify SDK prefetch latency on LTE. */
const DEFAULT_PREBUFFER_MS = 2_000;

/**
 * Publishes the `playback.scheduled` AppSync Events event (Story 9.2).
 *
 * Flow:
 *  1. Compute T = now + prebufferMs.
 *  2. Publish `{ type: 'playback.scheduled', data: { scheduledAt: T, track, participantIds } }`
 *     to the session channel (`/caraoke/session/{sessionId}`).
 *  3. Both clients — subscribed to that channel — receive T and call Spotify.play() at T.
 *
 * Replaces NullScheduledStartProducer from Story 9.1.
 */
export class AppSyncScheduledStartProducer implements ScheduledStartProducer {
  constructor(
    private readonly publisher: EventPublisher,
    /** Lead time in ms before the scheduled start. Configurable for testing. */
    private readonly prebufferMs: number = DEFAULT_PREBUFFER_MS,
  ) {}

  async schedule(params: {
    sessionId: string;
    participantIds: string[];
    track: ResolvedTrack;
  }): Promise<{ scheduledAt: string }> {
    const scheduledAt = new Date(Date.now() + this.prebufferMs).toISOString();

    await this.publisher.publish({
      type: 'playback.scheduled',
      version: 1,
      sessionId: params.sessionId,
      occurredAt: new Date().toISOString(),
      data: {
        scheduledAt,
        trackId: params.track.trackId,
        trackUri: params.track.uri,
        trackName: params.track.name,
        artist: params.track.artist,
        durationMs: params.track.durationMs,
        participantIds: params.participantIds,
      },
    });

    return { scheduledAt };
  }
}
