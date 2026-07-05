// Spotify playback CONTROL integration (Story 4.4/4.6, FR14/FR18/FR21). Commands each user's
// own Spotify client via the Web API using their stored OAuth refresh token. Follows the
// port/adapter pattern: services depend only on PlaybackController; the live adapter talks to
// Spotify, the mock no-ops for tests/offline.
//
// NOTE (road-test reality): the Spotify Web API can only drive an ACTIVE device — the user's
// Spotify app must be open and have been the active playback device at least once. A dead device
// returns 404; we surface that as a clear, actionable error.

import { AppError } from '@caraoke/shared';
import type { Env } from '../../config/env.js';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export interface PlaybackController {
  readonly mode: 'live' | 'mock';
  /** Load a track and leave it paused near position 0 (prebuffer for a synchronized start). */
  prepare(refreshToken: string, trackUri: string): Promise<void>;
  /** Start a SPECIFIC track at an absolute position — the authoritative synchronized start. */
  start(refreshToken: string, trackUri: string, positionMs: number): Promise<void>;
  /** Resume playback of the currently-loaded track (shared pause/resume controls). */
  resume(refreshToken: string): Promise<void>;
  /** Pause playback. */
  pause(refreshToken: string): Promise<void>;
  /** Seek to an absolute position (used by drift correction). */
  seek(refreshToken: string, positionMs: number): Promise<void>;
}

export class LivePlaybackController implements PlaybackController {
  readonly mode = 'live' as const;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private async accessToken(refreshToken: string): Promise<string> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) throw new AppError('INTERNAL', `Spotify token refresh failed: ${res.status}`);
    const { access_token: accessToken } = (await res.json()) as { access_token: string };
    return accessToken;
  }

  /**
   * Resolve a target device id. The Web API only controls an "active" device, which a phone
   * drops out of within moments of going idle/backgrounded — so instead we list available
   * devices and target the phone by id, which ACTIVATES it. Requires the Spotify app to be open
   * on the phone (it then appears here even when idle).
   */
  private async deviceId(accessToken: string): Promise<string> {
    const res = await fetch(`${SPOTIFY_API}/me/player/devices`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new AppError('INTERNAL', `Spotify devices fetch failed: ${res.status}`);
    const body = (await res.json()) as {
      devices?: Array<{ id: string | null; is_active: boolean; type: string; name: string }>;
    };
    const devices = (body.devices ?? []).filter((d) => d.id);
    console.warn('[spotify] devices', { count: devices.length, names: devices.map((d) => `${d.name}:${d.type}:${d.is_active}`) });
    if (devices.length === 0) {
      throw new AppError(
        'CONFLICT',
        'No Spotify device found. Open the Spotify app on your phone and keep it open, then try again.',
      );
    }
    const active = devices.find((d) => d.is_active);
    const phone = devices.find((d) => d.type === 'Smartphone');
    return (active ?? phone ?? devices[0]!).id as string;
  }

  private async command(accessToken: string, method: string, path: string, deviceId: string, body?: unknown): Promise<void> {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${SPOTIFY_API}${path}${sep}device_id=${encodeURIComponent(deviceId)}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) {
      const detail = await res.text().catch(() => '');
      console.warn('[spotify] command 404', { method, path, detail: detail.slice(0, 200) });
      throw new AppError('CONFLICT', 'Spotify device went away. Reopen the Spotify app and try again.');
    }
    if (res.status === 403) {
      const detail = await res.text().catch(() => '');
      console.warn('[spotify] command 403', { method, path, detail: detail.slice(0, 200) });
      throw new AppError('FORBIDDEN', 'Spotify refused the command (Premium required).');
    }
    if (![200, 202, 204].includes(res.status)) {
      throw new AppError('INTERNAL', `Spotify playback command failed: ${res.status}`);
    }
  }

  async prepare(refreshToken: string, trackUri: string): Promise<void> {
    const token = await this.accessToken(refreshToken);
    const device = await this.deviceId(token);
    // Load the track on the target device, then pause so both clients sit ready until T.
    await this.command(token, 'PUT', '/me/player/play', device, { uris: [trackUri] });
    await this.command(token, 'PUT', '/me/player/pause', device);
  }

  async start(refreshToken: string, trackUri: string, positionMs: number): Promise<void> {
    const token = await this.accessToken(refreshToken);
    const device = await this.deviceId(token);
    // Authoritative start: activate the target device and play THIS track from the shared
    // position, regardless of what was loaded/playing before.
    await this.command(token, 'PUT', '/me/player/play', device, {
      uris: [trackUri],
      position_ms: Math.max(0, Math.round(positionMs)),
    });
  }

  async resume(refreshToken: string): Promise<void> {
    const token = await this.accessToken(refreshToken);
    await this.command(token, 'PUT', '/me/player/play', await this.deviceId(token));
  }

  async pause(refreshToken: string): Promise<void> {
    const token = await this.accessToken(refreshToken);
    await this.command(token, 'PUT', '/me/player/pause', await this.deviceId(token));
  }

  async seek(refreshToken: string, positionMs: number): Promise<void> {
    const token = await this.accessToken(refreshToken);
    await this.command(token, 'PUT', `/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`, await this.deviceId(token));
  }
}

/** No-op controller for tests / mock integrations mode. */
export class MockPlaybackController implements PlaybackController {
  readonly mode = 'mock' as const;
  async prepare(): Promise<void> {}
  async start(): Promise<void> {}
  async resume(): Promise<void> {}
  async pause(): Promise<void> {}
  async seek(): Promise<void> {}
}

export function getPlaybackController(env: Env): PlaybackController {
  if (env.CARAOKE_INTEGRATIONS === 'live') {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET required for live playback control.');
    }
    return new LivePlaybackController(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
  }
  return new MockPlaybackController();
}
