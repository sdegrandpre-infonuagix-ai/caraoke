// Telemetry API calls (Story 4.9 / Story 8.1, FR42/FR43).
// All sentiment data is sent without PII — just the classified response and session ID.

import { apiFetch } from './client';
import type { FeltSentiment } from '../telemetry/feltTogether';

export interface FeltTogetherPayload {
  /** Raw transcript of the user's spoken answer (may be null if no response captured). */
  transcript: string | null;
  /** Classified sentiment derived from the transcript. */
  sentiment: FeltSentiment;
}

/**
 * Store the post-session "felt together?" response for telemetry (FR42).
 * No PII: voice audio is never stored; only the classified sentiment travels to the backend.
 */
export function storeFeltTogether(
  idToken: string,
  sessionId: string,
  payload: FeltTogetherPayload,
): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/feedback/felt-together`, {
    method: 'POST',
    token: idToken,
    body: payload,
  });
}
