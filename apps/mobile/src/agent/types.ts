// Voice-Agent shared types (Story 4.3, FR12/FR13/UX-DR9).
// The xAI Voice Agent runs server-side; the mobile sends a raw transcript and receives one of
// these structured responses, which drives the Riff TTS + failure-ladder state machine.

/** A candidate track from the Spotify MCP, returned on a successful intent match. */
export interface AgentTrack {
  id: string;
  name: string;
  artist: string;
  uri: string;
}

// --- Agent response actions ---

/**
 * `confirm` — agent recognised the song and is asking for binary yes/no confirmation.
 * Riff speaks `speech` ("You want to sing [song] by [artist]. Is that right?").
 */
export interface ConfirmResponse {
  action: 'confirm';
  speech: string;
  track: AgentTrack;
}

/**
 * `clarify` — ambiguous match; agent offers two binary choices (UX-DR9: binary-only).
 * Riff speaks `speech` ("Did you mean [A] or [B]?").
 */
export interface ClarifyResponse {
  action: 'clarify';
  speech: string;
  choices: [AgentTrack, AgentTrack];
}

/**
 * `re_ask` — first failure-ladder rung: agent didn't parse anything useful.
 * Riff speaks `speech` ("I didn't catch that — say the song name clearly.").
 */
export interface ReAskResponse {
  action: 're_ask';
  speech: string;
}

/**
 * `exit` — final failure-ladder rung after multiple misrecognitions.
 * Riff speaks `speech` ("No worries — tap to search when you're ready.").
 */
export interface ExitResponse {
  action: 'exit';
  speech: string;
}

/** Discriminated union of all agent response shapes. */
export type AgentResponse = ConfirmResponse | ClarifyResponse | ReAskResponse | ExitResponse;

/** What the caller sends to the backend agent endpoint. */
export interface IntentRequest {
  sessionId: string;
  transcript: string;
  /** BCP-47 language tag from the user's profile (FR4). */
  language: string;
}

/** Confirmation payload sent after the user says "yes". */
export interface ConfirmRequest {
  sessionId: string;
  trackId: string;
}
