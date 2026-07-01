// Voice-Agent orchestration hook (Story 4.3, FR12/FR13/UX-DR9).
// Wires the failure-ladder state machine to the Riff TTS + backend API, giving the caller
// a simple interface: call `submit(transcript)` after STT, call `answer(yes|no)` for
// binary confirmations/clarifications, and observe `rung` + `speech` for display/audio.

import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocale } from '../i18n/useLocale';
import { sonicEngine } from '../sonic';
import { sendIntent, confirmTrack } from '../api/agent';
import { parseAgentResponse } from './intentParser';
import {
  initialLadder,
  advanceLadder,
  confirmLadder,
  rejectLadder,
  isTerminal,
  type LadderState,
  type LadderRung,
} from './failureLadder';
import type { AgentTrack } from './types';

export interface RiffAgentState {
  /** Current ladder rung — drives UI visibility and audio cue. */
  rung: LadderRung;
  /** The text Riff most recently spoke (or is about to speak). */
  speech: string | null;
  /** Two binary choices when `rung === 'clarifying'`. */
  choices: [AgentTrack, AgentTrack] | null;
  /** True while the backend round-trip is in flight. */
  processing: boolean;
}

export interface RiffAgentActions {
  /** Call with the STT transcript immediately after the hot-window closes. */
  submit: (transcript: string) => Promise<void>;
  /**
   * Call after Riff finishes speaking a `confirm` or `clarify` prompt.
   * `answer` is true for "yes" / first choice, false for "no" / second choice.
   */
  answer: (yes: boolean) => Promise<void>;
  /** Reset the ladder to `listening` (e.g. user tapped the mic again). */
  reset: () => void;
}

export function useRiffAgent(sessionId: string): RiffAgentState & RiffAgentActions {
  const idToken = useAuthStore((s) => s.idToken);
  const { locale } = useLocale();
  const ladderRef = useRef<LadderState>(initialLadder());
  const [state, setState] = useState<RiffAgentState>({
    rung: 'listening',
    speech: null,
    choices: null,
    processing: false,
  });

  /** Apply a ladder transition and sync derived view state. */
  const applyLadder = useCallback((next: LadderState, speech: string | null, choices: [AgentTrack, AgentTrack] | null = null) => {
    ladderRef.current = next;
    if (speech) sonicEngine.riff.speak(speech, locale);
    setState({ rung: next.rung, speech, choices, processing: false });
  }, [locale]);

  const submit = useCallback(async (transcript: string) => {
    if (!idToken) return;
    if (isTerminal(ladderRef.current)) return;

    setState((s) => ({ ...s, processing: true }));

    let raw: unknown;
    try {
      raw = await sendIntent(idToken, { sessionId, transcript, language: locale });
    } catch {
      // Network failure counts as a miss.
      const next = advanceLadder(ladderRef.current, 're_ask');
      applyLadder(next, next.rung === 'exiting'
        ? "Sorry, I'm having trouble connecting. Let's try again later."
        : "I didn't catch that — try saying the song name again.");
      return;
    }

    const response = parseAgentResponse(raw);
    const next = advanceLadder(
      ladderRef.current,
      response.action,
      response.action === 'confirm' ? response.track.id : undefined,
      response.action === 'confirm' ? response.track.uri : undefined,
    );

    applyLadder(
      next,
      response.speech,
      response.action === 'clarify' ? response.choices : null,
    );
  }, [idToken, sessionId, locale, applyLadder]);

  const answer = useCallback(async (yes: boolean) => {
    if (!idToken) return;
    const current = ladderRef.current;

    if (current.rung === 'confirming') {
      if (yes && current.pendingTrackId) {
        // User confirmed — schedule playback via Spotify MCP (Story 4.4 picks it up).
        try {
          await confirmTrack(idToken, { sessionId, trackId: current.pendingTrackId });
          applyLadder(confirmLadder(current), null);
        } catch {
          const next = rejectLadder(current);
          applyLadder(next, "Something went wrong starting the song — try again.");
        }
      } else {
        // "No" — go back to listening (or exit if miss limit reached).
        const next = rejectLadder(current);
        applyLadder(next, next.rung === 'exiting'
          ? "No problem — tap to search when you're ready."
          : "Okay — say the song you'd like to sing.");
      }
    } else if (current.rung === 'clarifying' && state.choices) {
      // Binary choice: "yes" = first option, "no" = second option.
      const chosen = yes ? state.choices[0] : state.choices[1];
      // Re-enter as a confirm with the selected track.
      const next = advanceLadder(current, 'confirm', chosen.id, chosen.uri);
      applyLadder(next, `You want to sing ${chosen.name} by ${chosen.artist}. Is that right?`);
    }
  }, [idToken, sessionId, state.choices, applyLadder]);

  const reset = useCallback(() => {
    ladderRef.current = initialLadder();
    setState({ rung: 'listening', speech: null, choices: null, processing: false });
  }, []);

  return { ...state, submit, answer, reset };
}
