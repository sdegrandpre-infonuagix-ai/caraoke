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

/** A signed access token + URL the client SDK uses to join the voice room (Story 4.1). */
export interface VoiceGrant {
  url: string;
  token: string;
  room: string;
  identity: string;
}

/** The live-voice plane (FR23/FR24). Voice media is SRTP/DTLS end-to-end by construction. */
export interface MediaServer {
  readonly provider: MediaProvider;
  /** WebSocket signaling URL for the client SDK, or null if unconfigured. */
  signalingUrl(): string | null;
  /** Application-level reachability check used by the API health route. */
  health(): Promise<MediaHealth>;
  /**
   * Mint a join token for a participant: room = session id, identity = user id, with
   * publish + subscribe grants so both partners can speak and hear (full duplex).
   */
  createVoiceToken(room: string, identity: string): Promise<VoiceGrant>;
}

export function getMediaServer(env: Env): MediaServer {
  if (env.CARAOKE_INTEGRATIONS === 'live') {
    return new LiveKitMediaServer(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  }
  return new MockMediaServer();
}

export { LiveKitMediaServer } from './live.js';
export { MockMediaServer } from './mock.js';
