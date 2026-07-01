// Drift monitoring & correction hook (Story 4.5, FR19/FR20/NFR2).
// Every SAMPLE_INTERVAL_MS: estimates our local Spotify position from clock-sync elapsed time,
// broadcasts it over the LiveKit data channel, and computes the drift against the partner's last
// report. If |drift| > DRIFT_THRESHOLD_MS (50ms), the lagging device micro-seeks. No user-visible
// metric or interruption — correction must be imperceptible.

import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import type { Room } from 'livekit-client';
import { useAuthStore } from '../stores/useAuthStore';
import { clockSync } from '../lib/clockSync';
import { seekPlayback } from '../api/playback';
import {
  computeDrift,
  decodePositionMsg,
  encodePositionMsg,
  estimatePosition,
  SAMPLE_INTERVAL_MS,
  type PositionSample,
} from './driftMonitor';

export interface DriftState {
  /** Most recent computed drift (ms). Positive = we're ahead; negative = we're behind. */
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
 * @param sessionId         Active session ID (for the seek API call).
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

  // Keep the latest partner sample in a ref — no re-render on every data frame.
  const partnerSampleRef = useRef<PositionSample | null>(null);
  const correctingRef = useRef(false);

  // Receive partner's position broadcasts.
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
      // Non-fatal: the next sample cycle will re-evaluate drift.
      setState((s) => ({ ...s, correcting: false }));
    } finally {
      correctingRef.current = false;
    }
  }, [idToken, sessionId]);

  // Sampling loop: publish our position + compute drift every SAMPLE_INTERVAL_MS.
  useEffect(() => {
    if (!room || playStartServerMs === null) return;

    const interval = setInterval(() => {
      const nowServer = clockSync.serverNow();
      const ourPos = estimatePosition(playStartServerMs, nowServer);

      // Publish our position to the partner.
      const sample: PositionSample = { positionMs: ourPos, sampledAtServerMs: nowServer };
      try {
        void room.localParticipant.publishData(encodePositionMsg(sample), { reliable: false });
      } catch {
        // Data channel not ready yet — skip this tick.
      }

      // Compare with partner's last known position.
      const partnerSample = partnerSampleRef.current;
      if (!partnerSample) return;

      const { driftMs, needsCorrection, correctionTargetMs } = computeDrift(ourPos, partnerSample, nowServer);
      setState((s) => ({ ...s, driftMs }));

      // needsCorrection is only true when we're lagging (driftMs < -THRESHOLD).
      // The leading device does nothing — its partner catches up independently.
      if (needsCorrection) {
        void applyCorrection(correctionTargetMs);
      }
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [room, playStartServerMs, applyCorrection]);

  return state;
}
