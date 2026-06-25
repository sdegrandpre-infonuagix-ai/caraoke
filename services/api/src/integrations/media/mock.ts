import type { MediaServer, MediaHealth } from './index.js';

/**
 * Sandbox media server for offline dev and deterministic CI (NFR20, AR9). Always healthy;
 * never touches a real SFU.
 */
export class MockMediaServer implements MediaServer {
  readonly provider = 'mock' as const;

  signalingUrl(): string | null {
    return 'ws://mock-livekit.local:7880';
  }

  async health(): Promise<MediaHealth> {
    return { healthy: true, provider: this.provider, detail: 'sandbox' };
  }
}
