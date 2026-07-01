// Voice playback-control intent classifier (Story 4.6, FR17/FR21).
// A lightweight local keyword classifier for the three playback commands. No network call —
// these intents are unambiguous enough for device-side classification, which keeps the
// eyes-free experience immediate (FR17 forbids waiting on a backend round-trip for stop/pause).

export type PlaybackCommand = 'pause' | 'resume' | 'stop';

/**
 * Phrases recognised for each command. Matching is case-insensitive and allows surrounding words
 * (e.g. "can you pause please", "okay stop", "let's resume"). The arrays are ordered longest
 * match first to avoid false positives from substrings.
 */
const PAUSE_PATTERNS = [
  /\bpause\b/i,
  /\bhold on\b/i,
  /\bwait\b/i,
  /\bhold\b/i,
];

const RESUME_PATTERNS = [
  /\bresume\b/i,
  /\bcontinue\b/i,
  /\bkeep going\b/i,
  /\bstart again\b/i,
  /\bplay again\b/i,
  /\bunpause\b/i,
];

const STOP_PATTERNS = [
  /\bend\s+(?:the\s+)?session\b/i,
  /\bstop\s+(?:the\s+)?song\b/i,
  /\bstop\s+(?:the\s+)?music\b/i,
  /\bcancel\s+(?:the\s+)?session\b/i,
  /\bstop\b/i,
  /\bend\b/i,
  /\bfinish\b/i,
];

/**
 * Classify a raw STT transcript as a playback command.
 * Returns `null` if the transcript doesn't match any known command — the caller should then
 * forward the transcript to the xAI agent for general intent interpretation (Story 4.3).
 *
 * Priority: resume > pause > stop (to avoid accidentally stopping on ambiguous phrases).
 */
export function classifyPlaybackIntent(transcript: string): PlaybackCommand | null {
  // Resume has highest priority — avoid mis-classifying "stop and resume" as stop.
  for (const p of RESUME_PATTERNS) if (p.test(transcript)) return 'resume';
  for (const p of PAUSE_PATTERNS)  if (p.test(transcript)) return 'pause';
  for (const p of STOP_PATTERNS)   if (p.test(transcript)) return 'stop';
  return null;
}

/** Riff's spoken confirmation for each command (short — eyes-free should be concise, UX-DR9). */
export const COMMAND_CONFIRMATIONS: Record<PlaybackCommand, string> = {
  pause: 'Pausing.',
  resume: 'Resuming.',
  stop: 'Stopping the session.',
};
