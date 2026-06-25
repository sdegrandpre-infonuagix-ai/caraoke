import { AccessToken } from 'livekit-server-sdk';
import { AppError } from '@caraoke/shared';
import type { MediaServer, MediaHealth, VoiceGrant } from './index.js';

/**
 * Live adapter for the self-hosted LiveKit SFU (Story 1.5/4.1). Health is an HTTP reachability
 * probe; tokens are signed LiveKit JWTs granting room join + publish/subscribe (full-duplex
 * voice). The signing key/secret come from config (Secrets Manager in prod) — never the device.
 */
export class LiveKitMediaServer implements MediaServer {
  readonly provider = 'livekit' as const;

  constructor(
    private readonly url?: string,
    private readonly apiKey?: string,
    private readonly apiSecret?: string,
  ) {}

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

  async createVoiceToken(room: string, identity: string): Promise<VoiceGrant> {
    if (!this.url || !this.apiKey || !this.apiSecret) {
      throw new AppError('INTERNAL', 'LiveKit is not configured (URL/API key/secret).');
    }
    const at = new AccessToken(this.apiKey, this.apiSecret, { identity, ttl: '1h' });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    return { url: this.url, token, room, identity };
  }
}
