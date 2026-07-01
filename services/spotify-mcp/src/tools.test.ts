import { describe, it, expect } from 'vitest';
import { MockSpotifyController } from './spotify/index.js';
import {
  playTool,
  pauseTool,
  resumeTool,
  getPlaybackStateTool,
} from './tools.js';
import { loadSpotifyCredentials } from './credentials.js';
import type { Env } from './config/env.js';

const TOKEN = 'user-access-token';

describe('spotify MCP playback tools (mock controller)', () => {
  it('play_track starts the track and is reflected in state', async () => {
    const c = new MockSpotifyController();
    const res = await playTool(c, { accessToken: TOKEN, trackUri: 'spotify:track:abc', positionMs: 0 });
    expect(res.isError).toBeUndefined();

    const state = await getPlaybackStateTool(c, { accessToken: TOKEN });
    expect(JSON.parse(state.content[0]!.text)).toEqual({
      isPlaying: true,
      trackUri: 'spotify:track:abc',
      positionMs: 0,
    });
  });

  it('pause then resume toggles isPlaying', async () => {
    const c = new MockSpotifyController();
    await playTool(c, { accessToken: TOKEN, trackUri: 'spotify:track:abc' });
    await pauseTool(c, { accessToken: TOKEN });
    expect((await c.getPlaybackState(TOKEN)).isPlaying).toBe(false);
    await resumeTool(c, { accessToken: TOKEN });
    expect((await c.getPlaybackState(TOKEN)).isPlaying).toBe(true);
  });

  it('tool errors are returned as isError results, not thrown', async () => {
    const throwing = new MockSpotifyController();
    throwing.play = async () => {
      throw new Error('boom');
    };
    const res = await playTool(throwing, { accessToken: TOKEN, trackUri: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('boom');
  });
});

describe('credentials loader', () => {
  it('returns inert placeholders in mock mode (no AWS access)', async () => {
    const env = { CARAOKE_INTEGRATIONS: 'mock', AWS_REGION: 'ca-central-1' } as Env;
    const creds = await loadSpotifyCredentials(env);
    expect(creds.clientId).toBe('mock-client-id');
  });

  it('requires SPOTIFY_SECRET_ID in live mode', async () => {
    const env = { CARAOKE_INTEGRATIONS: 'live', AWS_REGION: 'ca-central-1' } as Env;
    await expect(loadSpotifyCredentials(env)).rejects.toThrow(/SPOTIFY_SECRET_ID/);
  });
});
