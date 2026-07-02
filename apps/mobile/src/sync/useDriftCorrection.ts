// Drift monitoring & correction hook (Story 4.5 / 9.4, FR19/FR20/NFR2).
// Story 9.4 redesign: sample the real Spotify playback position every SAMPLE_INTERVAL_MS
// (via the backend proxy to the Spotify Web API), then compare against the shared scheduled
// timeline (T + elapsed) using computeScheduleDrift. The old pattern of estimatePosition()
// was broken by construction — it computed drift from wall-clock arithmetic, never reading
// the actual Spotify client state.

import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import type { Room } from 'livekit-client';
import { useAuthStore } from '../stores/useAuthStore';
import { clockSync } from '../lib/clockSync';
import { seekPlayback, getPlaybackPosition } from '../api/playback';
import {
  computeScheduleDrift,
  encodePositionMsg,
  decodePositionMsg,
  SAMPLE_INTERVAL_MS,
  type PositionSample,
} from './driftMonitor';

export interface DriftState {
  /** Most recent computed drift (ms). Positive = we're ahead of the schedule; negative = behind. */
  driftMs: number | null;
  /** Total number of corrections applied this session. */
  correctionsApplied: number;
  /** True while a correction seek is in-flight. */
  correcting: boolean;
}

/**
 * Attach drift monitoring to an active LiveKit room.
 *
 * @param room              The connected LiveKit Room (null when voice is not yet open).
 * @param sessionId         Active session ID (for the seek API call and position polling).
 * @param playStartServerMs Server-epoch ms when playback started (from playback.scheduled event).
 *                          Pass null when not yet playing.
 */
export function useDriftCorrection(
  room: Room | null,
  sessionId: string,
  playStartServerMs: number | null,
): DriftState {
  const idToken = useAuthStore((s) => s.idToken);
  const [state, setState] = useState<DriftState>({
    driftMs: null,
    correctionsApplied: 0,
    correcting: false,
  });

  const correctingRef = useRef(false);

  // Receive partner position broadcasts and store them for the "felt-together" metric.
  // Drift correction is schedule-based (computeScheduleDrift), not partner-relative,
  // but we still keep the partner sample available for future telemetry use.
  const partnerSampleRef = useRef<PositionSample | null>(null);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      const sample = decodePositionMsg(payload);
      if (sample) partnerSampleRef.current = sample;
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room]);

  const applyCorrection = useCallback(async (targetMs: number) => {
    if (!idToken || correctingRef.current) return;
    correctingRef.current = true;
    setState((s) => ({ ...s, correcting: true }));
    try {
      await seekPlayback(idToken, sessionId, targetMs);
      setState((s) => ({ ...s, correctionsApplied: s.correctionsApplied + 1, correcting: false }));
    } catch {
      // Non-fatal: next sample cycle will re-evaluate.
      setState((s) => ({ ...s, correcting: false }));
    } finally {
      correctingRef.current = false;
    }
  }, [idToken, sessionId]);

  // Sampling loop: poll the real Spotify position, broadcast it, compare against the schedule.
  useEffect(() => {
    if (!room || playStartServerMs === null) return;

    const interval = setInterval(() => {
      if (!idToken) return;
      const nowServer = clockSync.serverNow();

      void (async () => {
        // Sample the real Spotify position — the core fix (Story 9.4).
        // estimatePosition() is NOT used here: it would compute drift from wall-clock arithmetic
        // and never catch Spotify-side buffering delays or seek inaccuracies.
        let realPositionMs: number;
        try {
          const pos = await getPlaybackPosition(idToken, sessionId);
          realPositionMs = pos.positionMs;
        } catch {
          // Position unavailable this tick — skip correction, don't seek from stale data.
          return;
        }

        // Broadcast our real position to the partner (not an estimate).
        const sample: PositionSample = { positionMs: realPositionMs, sampledAtServerMs: nowServer };
        try {
          void room.localParticipant.publishData(encodePositionMsg(sample), { reliable: false });
        } catch {
          // Data channel not ready — continue with drift check anyway.
        }

        // Compare real Spotify position against the shared scheduled timeline (T + elapsed).
        const { driftMs, needsCorrection, correctionTargetMs } = computeScheduleDrift(
          realPositionMs,
          playStartServerMs,
          nowServer,
        );
        setState((s) => ({ ...s, driftMs }));

        // Only the lagging device corrects. The leading device waits naturally.
        if (needsCorrection) {
          void applyCorrection(correctionTargetMs);
        }
      })();
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [room, playStartServerMs, idToken, sessionId, applyCorrection]);

  return state;
}
