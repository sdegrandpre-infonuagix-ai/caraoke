// Simultaneous scheduled-start hook (Story 4.4, FR14/FR18/NFR1/NFR21).
// Subscribes to the session's AppSync Events channel, receives `playback.scheduled{startAt, trackUri}`,
// pre-buffers via the backend (→ Spotify MCP), then fires the play command at exactly the
// local moment corresponding to the absolute server epoch T — targeting ≤200ms sync.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { clockSync } from '../lib/clockSync';
import { subscribeSessionEvents } from './appSyncEvents';
import { preBufferTrack, playTrack } from '../api/playback';
import { hasPrebufferWindow, localDelayMs, PRE_ROLL_MS } from './scheduledStart';
import { useSessionMachine } from '../stores/useSessionMachine';

export type ScheduledStartStatus =
  | 'idle'
  | 'pre_buffering'
  | 'scheduled'
  | 'playing'
  | 'error';

export interface ScheduledStartState {
  status: ScheduledStartStatus;
  trackUri: string | null;
  /** ms remaining until play fires (updated approximately every 200ms while scheduled). */
  msRemaining: number | null;
}

/** Pre-roll window used for the countdown display — mirrors scheduledStart.PRE_ROLL_MS. */
export { PRE_ROLL_MS };

export function useScheduledStart(sessionId: string): ScheduledStartState {
  const idToken = useAuthStore((s) => s.idToken);
  const transition = useSessionMachine((s) => s.transition);
  const [state, setState] = useState<ScheduledStartState>({
    status: 'idle',
    trackUri: null,
    msRemaining: null,
  });

  // Refs to cancel in-flight timers when the component unmounts or a new event arrives.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  useEffect(() => {
    if (!sessionId || !idToken) return;

    const unsub = subscribeSessionEvents(
      sessionId,
      (event) => {
        if (event.type !== 'playback.scheduled') return;

        const data = event.data as { trackUri: string; startAt: number };
        const { trackUri, startAt } = data;
        if (!trackUri || typeof startAt !== 'number') return;

        clearTimers();
        const now = Date.now();
        const offsetMs = clockSync.getOffsetMs();
        const delayMs = localDelayMs(startAt, now, offsetMs);

        setState({ status: 'pre_buffering', trackUri, msRemaining: delayMs });

        // Pre-buffer only if we have enough runway.
        const doPrebuffer = hasPrebufferWindow(startAt, now, offsetMs);
        const prebufferPromise = doPrebuffer
          ? preBufferTrack(idToken, sessionId, { trackUri }).catch(() => {
              // Non-fatal: Spotify may already have the track; proceed to play regardless.
            })
          : Promise.resolve();

        void prebufferPromise.then(() => {
          const msLeft = localDelayMs(startAt, Date.now(), clockSync.getOffsetMs());
          setState((s) => ({ ...s, status: 'scheduled', msRemaining: msLeft }));

          // Countdown display (every 200ms) — cosmetic only.
          countdownRef.current = setInterval(() => {
            const remaining = localDelayMs(startAt, Date.now(), clockSync.getOffsetMs());
            setState((s) => ({ ...s, msRemaining: remaining }));
          }, 200);

          // The critical timer: fire playTrack as close to T as possible.
          timerRef.current = setTimeout(() => {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;

            setState((s) => ({ ...s, status: 'playing', msRemaining: 0 }));
            transition('playing');

            void playTrack(idToken, sessionId).catch(() => {
              setState((s) => ({ ...s, status: 'error' }));
            });
          }, Math.max(0, localDelayMs(startAt, Date.now(), clockSync.getOffsetMs())));
        });
      },
      (err) => {
        console.error('[useScheduledStart] AppSync error:', err);
        setState((s) => ({ ...s, status: 'error' }));
      },
    );

    return () => {
      clearTimers();
      unsub();
    };
  }, [sessionId, idToken, transition, clearTimers]);

  return state;
}
