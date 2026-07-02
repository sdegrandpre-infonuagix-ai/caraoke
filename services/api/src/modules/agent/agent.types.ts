// Re-export the Spotify-layer track type so the rest of the agent module depends only on
// this file (avoids scattered imports from the integrations layer inside the module).
export type { ResolvedTrack } from '../../integrations/spotify/search.js';

import type { ResolvedTrack } from '../../integrations/spotify/search.js';

/** The result returned to the caller after a successful song request. */
export interface SongRequestResult {
  sessionId: string;
  track: ResolvedTrack;
  /** ISO-8601 timestamp at which both participants will begin playback (Story 9.2). */
  scheduledAt: string;
}
