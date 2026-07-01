// Voice playback-controls hook (Story 4.6, FR17/FR21).
// Accepts an STT transcript and applies the matching playback command. The local classifier
// handles the fast-path; unmatched transcripts bubble up to the xAI agent (Story 4.3).
// Riff speaks a brief confirmation after each action so the driver never needs to look.

import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocale } from '../i18n/useLocale';
import { sonicEngine } from '../sonic';
import { pausePlayback, resumePlayback, stopSession } from '../api/playback';
import { useSessionMachine } from '../stores/useSessionMachine';
import {
  classifyPlaybackIntent,
  COMMAND_CONFIRMATIONS,
  type PlaybackCommand,
} from './playbackIntent';

export type PlaybackControlStatus = 'idle' | 'applying' | 'applied' | 'error';

export interface PlaybackControlState {
  status: PlaybackControlStatus;
  lastCommand: PlaybackCommand | null;
}

export interface PlaybackControlActions {
  /**
   * Attempt to classify the transcript as a playback command and apply it.
   * Returns `true` if the transcript was consumed (matched a command); `false` if the caller
   * should forward it to the general xAI intent pipeline (Story 4.3).
   */
  handleTranscript: (transcript: string) => Promise<boolean>;
}

export function usePlaybackControls(sessionId: string): PlaybackControlState & PlaybackControlActions {
  const idToken = useAuthStore((s) => s.idToken);
  const { locale } = useLocale();
  const transition = useSessionMachine((s) => s.transition);
  const [state, setState] = useState<PlaybackControlState>({ status: 'idle', lastCommand: null });

  const handleTranscript = useCallback(async (transcript: string): Promise<boolean> => {
    const command = classifyPlaybackIntent(transcript);
    if (!command || !idToken) return false;

    setState({ status: 'applying', lastCommand: command });

    // Speak the confirmation immediately (eyes-free — UX-DR9 concision).
    sonicEngine.riff.speak(COMMAND_CONFIRMATIONS[command], locale);

    try {
      switch (command) {
        case 'pause':
          await pausePlayback(idToken, sessionId);
          break;
        case 'resume':
          await resumePlayback(idToken, sessionId);
          break;
        case 'stop':
          await stopSession(idToken, sessionId);
          transition('ended');
          break;
        case 'leave':
          // FR34: immediate local disconnect — transition first, then best-effort backend call.
          // Works even without network, so the user is NEVER trapped.
          transition('ended');
          stopSession(idToken, sessionId).catch(() => {});
          break;
      }
      setState({ status: 'applied', lastCommand: command });
    } catch {
      // Riff already spoke the confirmation — a silent retry is better than a correction
      // that confuses the driver. The AppSync event will clarify state if the call did land.
      setState({ status: 'error', lastCommand: command });
    }

    return true;
  }, [idToken, sessionId, locale, transition]);

  return { ...state, handleTranscript };
}
