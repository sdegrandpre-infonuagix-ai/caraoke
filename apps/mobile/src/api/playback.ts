// Playback control API (Story 4.4, FR14/FR18/NFR21). All Spotify calls are proxied through
// the backend (which holds the stored Spotify tokens). The device never touches Spotify's API
// directly — the control plane goes mobile → our API → Spotify MCP → Spotify.

import { apiFetch } from './client';

export interface PreBufferRequest {
  /** Spotify track URI (e.g. "spotify:track:abc123"). */
  trackUri: string;
}

/**
 * Tell the backend to pre-buffer the track on the user's Spotify client, paused at position 0.
 * The backend calls the Spotify MCP `play_track` then immediately `pause_playback`.
 */
export function preBufferTrack(idToken: string, sessionId: string, req: PreBufferRequest): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/playback/prebuffer`, {
    method: 'POST',
    token: idToken,
    body: req,
  });
}

/**
 * Tell the backend to resume playback on the user's Spotify client.
 * Called at the exact local moment when server-time === T (from clockSync.msUntil).
 * The backend calls the Spotify MCP `resume_playback` immediately on receipt.
 */
export function playTrack(idToken: string, sessionId: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/playback/play`, {
    method: 'POST',
    token: idToken,
  });
}
