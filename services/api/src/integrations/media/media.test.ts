import { describe, it, expect } from 'vitest';
import { getMediaServer, MockMediaServer, LiveKitMediaServer } from './index.js';
import type { Env } from '../../config/env.js';

const baseEnv: Env = {
  NODE_ENV: 'test',
  API_PORT: 3000,
  CARAOKE_INTEGRATIONS: 'mock',
  AWS_REGION: 'ca-central-1',
};

describe('media integration abstraction', () => {
  it('selects the mock adapter in mock mode', () => {
    const media = getMediaServer(baseEnv);
    expect(media).toBeInstanceOf(MockMediaServer);
    expect(media.provider).toBe('mock');
  });

  it('selects the LiveKit adapter in live mode', () => {
    const media = getMediaServer({
      ...baseEnv,
      CARAOKE_INTEGRATIONS: 'live',
      LIVEKIT_URL: 'ws://livekit.example:7880',
    });
    expect(media).toBeInstanceOf(LiveKitMediaServer);
    expect(media.signalingUrl()).toBe('ws://livekit.example:7880');
  });

  it('mock health is always healthy', async () => {
    const health = await new MockMediaServer().health();
    expect(health).toEqual({ healthy: true, provider: 'mock', detail: 'sandbox' });
  });

  it('live adapter reports unhealthy when no URL is configured', async () => {
    const health = await new LiveKitMediaServer(undefined).health();
    expect(health.healthy).toBe(false);
    expect(health.provider).toBe('livekit');
  });

  it('mock createVoiceToken returns a deterministic grant', async () => {
    const grant = await new MockMediaServer().createVoiceToken('sess-1', 'user-1');
    expect(grant).toMatchObject({ room: 'sess-1', identity: 'user-1' });
    expect(grant.token).toContain('sess-1');
    expect(grant.url).toContain('ws://');
  });

  it('live createVoiceToken throws when signing keys are unconfigured', async () => {
    await expect(
      new LiveKitMediaServer('ws://lk:7880').createVoiceToken('r', 'u'),
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});
