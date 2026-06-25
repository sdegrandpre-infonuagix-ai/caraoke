import type { MediaServer, MediaHealth, VoiceGrant } from './index.js';

/**
 * Sandbox media server for offline dev and deterministic CI (NFR20, AR9). Always healthy;
 * never touches a real SFU. Tokens are deterministic placeholders.
 */
export class MockMediaServer implements MediaServer {
  readonly provider = 'mock' as const;

  signalingUrl(): string | null {
    return 'ws://mock-livekit.local:7880';
  }

  async health(): Promise<MediaHealth> {
    return { healthy: true, provider: this.provider, detail: 'sandbox' };
  }

  async createVoiceToken(room: string, identity: string): Promise<VoiceGrant> {
    return {
      url: this.signalingUrl()!,
      token: `mock-token.${room}.${identity}`,
      room,
      identity,
    };
  }
}
