// ⚠️ THROWAWAY — Phase 0 harness (Story 1.3). Controls THIS phone's OWN Spotify playback
// via the Spotify Web API. Each phone streams the song from Spotify directly — the audio
// never traverses the WebRTC peer connection (NFR21). Requires a Premium access token
// (pasted into the harness; full OAuth is Story 2.4).

const API = 'https://api.spotify.com/v1';

export class SpotifyClient {
  constructor(private accessToken: string) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /** Start (or restart) the given track from position 0 on this device. */
  async play(trackUri: string, positionMs = 0): Promise<void> {
    const res = await fetch(`${API}/me/player/play`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ uris: [trackUri], position_ms: positionMs }),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Spotify play failed: ${res.status} ${await res.text()}`);
    }
  }

  async pause(): Promise<void> {
    await fetch(`${API}/me/player/pause`, { method: 'PUT', headers: this.headers() });
  }

  /**
   * Current playback position in ms (and wall-clock when sampled). Used by the Story 1.4
   * drift sampler to compare position-vs-wallclock across the two phones.
   */
  async positionMs(): Promise<{ positionMs: number; sampledAt: number } | null> {
    const res = await fetch(`${API}/me/player`, { headers: this.headers() });
    if (res.status === 204 || !res.ok) return null;
    const body = (await res.json()) as { progress_ms?: number };
    return { positionMs: body.progress_ms ?? 0, sampledAt: Date.now() };
  }
}
