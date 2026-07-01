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

/**
 * Pause playback on BOTH users' Spotify clients (Story 4.6, FR21).
 * Backend calls Spotify MCP pause on both devices and publishes `playback.paused` via AppSync.
 */
export function pausePlayback(idToken: string, sessionId: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/playback/pause`, {
    method: 'POST',
    token: idToken,
  });
}

/**
 * Resume playback on BOTH users' Spotify clients (Story 4.6, FR21).
 * Backend calls Spotify MCP resume on both devices and publishes `playback.resumed` via AppSync.
 */
export function resumePlayback(idToken: string, sessionId: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/playback/resume`, {
    method: 'POST',
    token: idToken,
  });
}

/**
 * Stop the session: pause both Spotify clients and end the session (Story 4.6, FR21).
 * Backend publishes `session.ended` via AppSync. The session machine transitions to `ended`.
 */
export function stopSession(idToken: string, sessionId: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/playback/stop`, {
    method: 'POST',
    token: idToken,
  });
}

/**
 * Seek to a specific position (ms) on the user's Spotify client.
 * Used by the drift-correction loop (Story 4.5, FR20): a micro-seek on the lagging device
 * to bring it within the ≤50ms target. Imperceptible for seeks < 500ms.
 */
export function seekPlayback(idToken: string, sessionId: string, positionMs: number): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/playback/seek`, {
    method: 'POST',
    token: idToken,
    body: { positionMs: Math.round(positionMs) },
  });
}
