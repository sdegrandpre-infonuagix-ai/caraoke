// Post-session "felt together?" capture hook (Story 4.9, FR16/FR42/UX-DR16).
//
// Lifecycle:
//   1. Session transitions to 'ended'.
//   2. After a 2-second afterglow, RiffVoice asks "Did that feel like singing together?".
//   3. The hook opens a 10-second answer window and returns `captureAnswer(transcript)`.
//   4. When the caller submits a transcript (from STT), sentiment is classified and stored.
//   5. If the window closes with no answer, `no_response` is stored so telemetry is complete.
//   6. No visual component is ever shown (UX-DR16).

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSessionMachine } from '../stores/useSessionMachine';
import { useLocale } from '../i18n/useLocale';
import { sonicEngine } from '../sonic';
import { storeFeltTogether } from '../api/telemetry';
import {
  classifySentiment,
  AFTERGLOW_MS,
  ANSWER_WINDOW_MS,
  FELT_TOGETHER_QUESTION,
} from './feltTogether';

export interface FeltTogetherCapture {
  /** True while the hook is listening for the user's spoken answer. */
  awaitingAnswer: boolean;
  /**
   * Submit a transcript (from STT) to close the capture window.
   * Returns immediately; storage is fire-and-forget.
   */
  captureAnswer: (transcript: string) => void;
}

export function useFeltTogether(sessionId: string): FeltTogetherCapture {
  const sessionState = useSessionMachine((s) => s.state);
  const idToken = useAuthStore((s) => s.idToken);
  const { current: locale } = useLocale();

  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const windowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answeredRef = useRef(false);

  const store = useCallback(
    (transcript: string | null) => {
      if (!idToken) return;
      storeFeltTogether(idToken, sessionId, {
        transcript,
        sentiment: classifySentiment(transcript),
      }).catch(() => {});
    },
    [idToken, sessionId],
  );

  const closeWindow = useCallback(
    (transcript: string | null) => {
      if (windowTimerRef.current) {
        clearTimeout(windowTimerRef.current);
        windowTimerRef.current = null;
      }
      setAwaitingAnswer(false);
      store(transcript);
    },
    [store],
  );

  useEffect(() => {
    if (sessionState !== 'ended') return;
    answeredRef.current = false;

    // Wait for the afterglow before asking — let the musical moment breathe (UX-DR16).
    const afterglowTimer = setTimeout(() => {
      sonicEngine.riff.speak(FELT_TOGETHER_QUESTION, locale);
      setAwaitingAnswer(true);

      // Auto-close the window after ANSWER_WINDOW_MS if no answer arrives.
      windowTimerRef.current = setTimeout(() => {
        if (!answeredRef.current) {
          closeWindow(null); // no_response
        }
      }, ANSWER_WINDOW_MS);
    }, AFTERGLOW_MS);

    return () => {
      clearTimeout(afterglowTimer);
      if (windowTimerRef.current) {
        clearTimeout(windowTimerRef.current);
        windowTimerRef.current = null;
      }
    };
  }, [sessionState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unmount cleanup
  useEffect(
    () => () => {
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
    },
    [],
  );

  const captureAnswer = useCallback(
    (transcript: string) => {
      if (!awaitingAnswer || answeredRef.current) return;
      answeredRef.current = true;
      closeWindow(transcript);
    },
    [awaitingAnswer, closeWindow],
  );

  return { awaitingAnswer, captureAnswer };
}
