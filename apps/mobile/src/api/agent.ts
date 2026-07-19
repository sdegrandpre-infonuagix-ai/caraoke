// Agent API client (Story 4.3, FR12/FR13). The xAI key and Spotify MCP live entirely
// server-side; the mobile sends raw transcripts and receives structured AgentResponses.
import { apiFetch } from './client';
import type { AgentResponse, IntentRequest, ConfirmRequest } from '../agent/types';

export interface SongRequestResult {
  sessionId: string;
  track: { trackId: string; uri: string; name: string; artist: string; durationMs: number };
  /** ISO timestamp the pick was proposed. Playback is NOT scheduled until both tap Start singing. */
  proposedAt: string;
}

export type StartConfirmResult =
  | { status: 'waiting'; confirmedCount: number; participantCount: number }
  | { status: 'scheduled'; scheduledAt: string; confirmedCount: number; participantCount: number };

/**
 * The host PICKS a song for the session (Story 9.1). The backend resolves the free-text query to a
 * Spotify track and broadcasts `song.proposed` — both phones show it. Playback is NOT scheduled
 * here: both participants must then confirm via confirmStart(). POST /sessions/:id/agent.
 */
export function requestSong(idToken: string, sessionId: string, query: string): Promise<SongRequestResult> {
  return apiFetch<SongRequestResult>(`/sessions/${sessionId}/agent`, {
    method: 'POST',
    token: idToken,
    body: { query },
  });
}

/**
 * Confirm "Start singing" for the session. Once BOTH participants confirm, the backend schedules
 * the synchronized start (publishes `playback.scheduled`, which useScheduledStart drives into
 * in-sync playback). Until then this returns { status: 'waiting' }. POST /sessions/:id/agent/start.
 */
export function confirmStart(idToken: string, sessionId: string): Promise<StartConfirmResult> {
  return apiFetch<StartConfirmResult>(`/sessions/${sessionId}/agent/start`, {
    method: 'POST',
    token: idToken,
    body: {},
  });
}

/**
 * Send a voice transcript to the backend xAI agent. The backend calls Grok, resolves the
 * intent, optionally calls the Spotify MCP for a track match, and returns a typed response.
 * Grok key is brokered server-side (Architecture: Secrets Management) — never reaches the device.
 */
export function sendIntent(idToken: string, req: IntentRequest): Promise<AgentResponse> {
  return apiFetch<AgentResponse>('/agent/intent', {
    method: 'POST',
    token: idToken,
    body: req,
  });
}

/**
 * Confirm the queued track after the user says "yes". The backend calls the Spotify MCP to
 * schedule `playback.scheduled{T}` — both devices will receive the absolute start time via
 * AppSync Events and pre-buffer (Story 4.4).
 */
export function confirmTrack(idToken: string, req: ConfirmRequest): Promise<{ status: 'queued' }> {
  return apiFetch<{ status: 'queued' }>('/agent/confirm', {
    method: 'POST',
    token: idToken,
    body: req,
  });
}
