// Moderation intent classifier (Story 6.1, FR33/UX-DR9).
// Local keyword classifier for the three safety commands: mute, block, report.
// Same pattern as playbackIntent (Story 4.6) — no network call, immediate response.
// Since duets are one-on-one the target is always the only partner ("them", "this person", etc.).

export type ModerationCommand = 'mute' | 'block' | 'report';

const MUTE_PATTERNS = [
  /\bmute\s+(?:my\s+)?(?:partner|them|this\s+person|voice)\b/i,
  /\bsilence\s+(?:my\s+)?(?:partner|them|this\s+person|voice)\b/i,
  /\bturn\s+(?:them|this\s+person|the\s+voice)\s+off\b/i,
  /\bstop\s+(?:their|the)\s+voice\b/i,
  /\bmute\b/i,
];

const BLOCK_PATTERNS = [
  /\bblock\s+(?:my\s+)?(?:partner|them|this\s+person)\b/i,
  /\bblock\s+(?:and\s+)?(?:report)?\b/i,
  /\bblock\b/i,
];

const REPORT_PATTERNS = [
  /\breport\s+(?:my\s+)?(?:partner|them|this\s+person)\b/i,
  /\breport\s+(?:this|an?\s+)?\s*(?:incident|abuse|user)?\b/i,
  /\breport\b/i,
];

/**
 * Classify a transcript as a mute/block/report command.
 * Priority: block > report > mute (stronger actions take precedence on ambiguity).
 * Returns `null` for non-moderation transcripts so the caller can forward to xAI.
 */
export function classifyModerationIntent(transcript: string): ModerationCommand | null {
  for (const p of BLOCK_PATTERNS) if (p.test(transcript)) return 'block';
  for (const p of REPORT_PATTERNS) if (p.test(transcript)) return 'report';
  for (const p of MUTE_PATTERNS) if (p.test(transcript)) return 'mute';
  return null;
}

/** Riff's spoken acknowledgement for each moderation action (short — eyes-free, UX-DR9). */
export const MODERATION_CONFIRMATIONS: Record<ModerationCommand, string> = {
  mute: "Partner muted.",
  block: "They've been blocked. You won't be paired again.",
  report: "Report filed. Thank you for keeping Caraoke safe.",
};
