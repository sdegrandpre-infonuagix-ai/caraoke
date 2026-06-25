import type { MediaServer, MediaHealth } from './index.js';

/**
 * Live adapter for the self-hosted LiveKit SFU (Story 1.5). Health is an HTTP reachability
 * probe against the SFU's signaling port (LiveKit answers HTTP on the same port). Room/token
 * issuance is layered on in Story 4.1.
 */
export class LiveKitMediaServer implements MediaServer {
  readonly provider = 'livekit' as const;

  constructor(private readonly url?: string) {}

  signalingUrl(): string | null {
    return this.url ?? null;
  }

  async health(): Promise<MediaHealth> {
    if (!this.url) {
      return { healthy: false, provider: this.provider, detail: 'LIVEKIT_URL not set' };
    }
    const httpUrl = this.url.replace(/^ws/, 'http');
    try {
      const res = await fetch(httpUrl, { method: 'GET' });
      // Any HTTP response means the SFU is reachable; 5xx means it's up but unhealthy.
      return {
        healthy: res.status < 500,
        provider: this.provider,
        detail: `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        provider: this.provider,
        detail: err instanceof Error ? err.message : 'unreachable',
      };
    }
  }
}
