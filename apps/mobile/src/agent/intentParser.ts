// Intent response parser (Story 4.3). Validates the raw API payload before it enters the
// failure-ladder state machine — malformed responses from the backend are treated as re_ask.

import type { AgentResponse, AgentTrack } from './types';

function isTrack(v: unknown): v is AgentTrack {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t['id'] === 'string' &&
    typeof t['name'] === 'string' &&
    typeof t['artist'] === 'string' &&
    typeof t['uri'] === 'string'
  );
}

/**
 * Parse and narrow a raw backend payload to a typed `AgentResponse`. Unknown or structurally
 * invalid payloads produce a synthetic `re_ask` so the failure ladder handles them gracefully
 * rather than crashing.
 */
export function parseAgentResponse(raw: unknown): AgentResponse {
  if (typeof raw !== 'object' || raw === null) {
    return { action: 're_ask', speech: "I didn't catch that — try again." };
  }

  const r = raw as Record<string, unknown>;
  const speech = typeof r['speech'] === 'string' ? r['speech'] : "I didn't catch that — try again.";

  switch (r['action']) {
    case 'confirm': {
      if (isTrack(r['track'])) return { action: 'confirm', speech, track: r['track'] };
      return { action: 're_ask', speech };
    }
    case 'clarify': {
      const choices = r['choices'];
      if (
        Array.isArray(choices) &&
        choices.length === 2 &&
        isTrack(choices[0]) &&
        isTrack(choices[1])
      ) {
        return { action: 'clarify', speech, choices: [choices[0], choices[1]] };
      }
      return { action: 're_ask', speech };
    }
    case 're_ask':
      return { action: 're_ask', speech };
    case 'exit':
      return { action: 'exit', speech };
    default:
      return { action: 're_ask', speech };
  }
}
