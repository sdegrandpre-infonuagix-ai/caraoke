// Post-session "felt together?" capture primitives (Story 4.9, FR16/FR42/UX-DR16).
// All functions are pure so they can be unit-tested without React or native modules.
// The hook (useFeltTogether) wraps these with session-machine observation and RiffVoice.

/** Delay after session.ended before Riff asks (UX-DR16 afterglow). */
export const AFTERGLOW_MS = 2_000;

/** Listening window for the user's spoken answer before we time out. */
export const ANSWER_WINDOW_MS = 10_000;

export const FELT_TOGETHER_QUESTION =
  "Did that feel like singing together?";

export type FeltSentiment = 'yes' | 'no' | 'unclear' | 'no_response';

/**
 * Keyword-based sentiment classifier for the felt-together answer.
 * Returns 'no_response' for an empty/null transcript; 'unclear' when both polarities
 * appear or when no known keywords are matched.
 */
export function classifySentiment(transcript: string | null | undefined): FeltSentiment {
  if (!transcript || !transcript.trim()) return 'no_response';

  const lower = transcript.toLowerCase();

  // "felt" and "together" are intentionally omitted — they appear in negative phrases too
  // ("felt separate", "didn't feel together"), making them unreliable polarity signals.
  // "it did" and "felt/together" omitted — they fire in negative phrases ("it did not", "felt separate").
  const YES = /\b(yes|yeah|yep|yup|absolutely|definitely|totally|sure|amazing|great|loved|perfect|wonderful|beautiful|awesome|fantastic)\b/;
  const NO = /\b(no|nope|nah|not really|didn't|did not|wasn't|was not|disconnect|disconnected|lag|laggy|off|separate|apart|couldn't|could not)\b/;

  const hasYes = YES.test(lower);
  const hasNo = NO.test(lower);

  if (hasYes && !hasNo) return 'yes';
  if (hasNo && !hasYes) return 'no';
  return 'unclear';
}
