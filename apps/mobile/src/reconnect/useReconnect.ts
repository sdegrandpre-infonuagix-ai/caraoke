// Voice-first reconnect handler (Story 4.8, FR15/FR25/FR26/UX-DR11).
// When the LiveKit voice room drops during a session, Riff announces the glitch by voice,
// waits for LiveKit's built-in auto-reconnect, and resumes playback on recovery.
// If the continuity window (60 s) expires without recovery, Riff ends the session warmly.
// No modal or screen change is ever required (UX-DR11).

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSessionMachine } from '../stores/useSessionMachine';
import { useLocale } from '../i18n/useLocale';
import { sonicEngine } from '../sonic';
import { resumePlayback, stopSession } from '../api/playback';
import type { VoiceStatus } from '../voice/useVoiceRoom';
import {
  CONTINUITY_WINDOW_MS,
  RIFF_RECONNECTING,
  RIFF_RECONNECTED,
  RIFF_GIVE_UP,
} from './reconnectLogic';

export function useReconnect(sessionId: string, voiceStatus: VoiceStatus): void {
  const sessionState = useSessionMachine((s) => s.state);
  const transition = useSessionMachine((s) => s.transition);
  const idToken = useAuthStore((s) => s.idToken);
  const { current: locale } = useLocale();

  // Give-up timer lives in a ref so effect re-runs (caused by state changes) don't cancel it.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (voiceStatus === 'reconnecting' && sessionState === 'playing') {
      // Connection dropped mid-session → enter reconnecting state, speak calmly (UX-DR11).
      transition('reconnecting');
      sonicEngine.riff.speak(RIFF_RECONNECTING, locale);

      // Start the continuity window. LiveKit will auto-reconnect; if it doesn't succeed
      // within 60 s we give up and end the session gracefully (FR26).
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        transition('ended');
        sonicEngine.riff.speak(RIFF_GIVE_UP, locale);
        if (idToken) {
          stopSession(idToken, sessionId).catch(() => {});
        }
      }, CONTINUITY_WINDOW_MS);
    } else if (voiceStatus === 'connected' && sessionState === 'reconnecting') {
      // LiveKit auto-reconnected within the continuity window (FR15/FR25).
      clearTimer();
      transition('playing');
      sonicEngine.riff.speak(RIFF_RECONNECTED, locale);
      // Resume playback on both devices so drift correction can re-lock (FR25).
      if (idToken) {
        resumePlayback(idToken, sessionId).catch(() => {});
      }
    } else if (voiceStatus === 'idle' && sessionState === 'reconnecting') {
      // LiveKit gave up entirely (fired Disconnected rather than Reconnected).
      // Treat the same as a timeout: end gracefully.
      clearTimer();
      transition('ended');
      sonicEngine.riff.speak(RIFF_GIVE_UP, locale);
      if (idToken) {
        stopSession(idToken, sessionId).catch(() => {});
      }
    }
  }, [voiceStatus, sessionState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Always clear the timer on unmount.
  useEffect(() => () => clearTimer(), [clearTimer]);
}
