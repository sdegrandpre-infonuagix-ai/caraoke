// Media-server integration abstraction (NFR20, architecture: Integration boundary).
// The live LiveKit adapter and a sandbox mock sit behind one interface, selected by env
// (CARAOKE_INTEGRATIONS=live|mock). No module talks to LiveKit directly.

import type { Env } from '../../config/env.js';
import { LiveKitMediaServer } from './live.js';
import { MockMediaServer } from './mock.js';

export type MediaProvider = 'livekit' | 'mock';

export interface MediaHealth {
  healthy: boolean;
  provider: MediaProvider;
  detail?: string;
}

/** The live-voice plane (Epic 4 builds rooms/tokens on top of this in Story 4.1). */
export interface MediaServer {
  readonly provider: MediaProvider;
  /** WebSocket signaling URL for the client SDK, or null if unconfigured. */
  signalingUrl(): string | null;
  /** Application-level reachability check used by the API health route. */
  health(): Promise<MediaHealth>;
}

export function getMediaServer(env: Env): MediaServer {
  if (env.CARAOKE_INTEGRATIONS === 'live') {
    return new LiveKitMediaServer(env.LIVEKIT_URL);
  }
  return new MockMediaServer();
}

export { LiveKitMediaServer } from './live.js';
export { MockMediaServer } from './mock.js';
