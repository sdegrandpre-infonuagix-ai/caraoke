// Continuous drift correction for the on-device Spotify SDK (Story 4.5, FR19/FR20/NFR2).
//
// Each phone plays its OWN Spotify copy from the shared scheduled start T. Playback rate is
// steady, but a phone that buffered or recovered from a stale connection can sit behind the
// shared timeline for the rest of the song. This hook keeps each phone aligned to that timeline:
// every SAMPLE_INTERVAL_MS it reads the LOCAL Spotify position (App Remote — no backend/Web-API
// active-device round-trip) and, if it's behind by more than the threshold, seeks forward onto
// the schedule (T + elapsed). Only the lagging phone corrects; a phone can't run ahead of
// wall-clock, so there's no leader coordination to do.

import { useEffect, useRef, useState } from 'react';
import { clockSync } from '../lib/clockSync';
import { computeScheduleDrift, SAMPLE_INTERVAL_MS } from './driftMonitor';
import { getOnDevicePlayback, seekOnDevice } from '../spotify/appRemote';

export interface OnDeviceDriftState {
  /** Most recent measured drift (ms). Negative = behind the schedule. Null before first sample. */
  driftMs: number | null;
  /** Number of corrective seeks applied this session. */
  correctionsApplied: number;
}

/**
 * @param playStartServerMs Server-epoch ms of the shared start T (from useScheduledStart), or null
 *                          when not playing — the loop only runs while a real T is set.
 */
export function useOnDeviceDriftCorrection(playStartServerMs: number | null): OnDeviceDriftState {
  const [state, setState] = useState<OnDeviceDriftState>({ driftMs: null, correctionsApplied: 0 });
  const correctingRef = useRef(false);

  useEffect(() => {
    if (playStartServerMs === null) return;

    const interval = setInterval(() => {
      void (async () => {
        // Skip while a correction seek is still in flight — don't stack seeks.
        if (correctingRef.current) return;

        const playback = await getOnDevicePlayback();
        // No live connection or the song is paused → nothing to correct this tick.
        if (!playback || playback.isPaused) return;

        const { driftMs, needsCorrection, correctionTargetMs } = computeScheduleDrift(
          playback.positionMs,
          playStartServerMs,
          clockSync.serverNow(),
        );
        setState((s) => ({ ...s, driftMs }));

        if (needsCorrection) {
          correctingRef.current = true;
          try {
            await seekOnDevice(correctionTargetMs);
            setState((s) => ({ ...s, correctionsApplied: s.correctionsApplied + 1 }));
          } catch {
            // Non-fatal — the next tick re-measures and retries.
          } finally {
            correctingRef.current = false;
          }
        }
      })();
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [playStartServerMs]);

  return state;
}
