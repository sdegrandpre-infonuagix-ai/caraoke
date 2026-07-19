// Re-export the Spotify-layer track type so the rest of the agent module depends only on
// this file (avoids scattered imports from the integrations layer inside the module).
export type { ResolvedTrack } from '../../integrations/spotify/search.js';

import type { ResolvedTrack } from '../../integrations/spotify/search.js';

/**
 * Result of a song request. The host has *proposed* a track; playback is NOT scheduled yet —
 * both participants must POST /sessions/:id/agent/start ("Start singing") first.
 */
export interface SongRequestResult {
  sessionId: string;
  track: ResolvedTrack;
  /** ISO-8601 timestamp the proposal was made. */
  proposedAt: string;
}

/** Result of a "Start singing" confirmation. */
export type StartConfirmResult =
  | { status: 'waiting'; confirmedCount: number; participantCount: number }
  | { status: 'scheduled'; scheduledAt: string; confirmedCount: number; participantCount: number };
