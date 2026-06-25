import { apiFetch } from './client';

export interface VoiceGrant {
  url: string;
  token: string;
  room: string;
  identity: string;
}

/** Mint a LiveKit join token for the session's voice plane (FR23). Participant-gated server-side. */
export function getVoiceToken(idToken: string, sessionId: string): Promise<VoiceGrant> {
  return apiFetch<VoiceGrant>(`/sessions/${sessionId}/voice-token`, {
    method: 'POST',
    token: idToken,
  });
}
