// Agent API client (Story 4.3, FR12/FR13). The xAI key and Spotify MCP live entirely
// server-side; the mobile sends raw transcripts and receives structured AgentResponses.
import { apiFetch } from './client';
import type { AgentResponse, IntentRequest, ConfirmRequest } from '../agent/types';

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
