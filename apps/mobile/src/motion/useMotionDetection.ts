// Accelerometer-based vehicle motion detection (Story 4.7, FR17).
// Samples the device accelerometer at 5 Hz, computes rolling variance, and applies
// a debounce to prevent driving/stationary flickering at red lights (UX-DR5).

import { useEffect, useRef, useState, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';
import {
  magnitude,
  classifyMotion,
  advanceDebounce,
  initDebounce,
  type DebounceState,
  SAMPLE_WINDOW,
} from './motionDetect';

const SAMPLE_INTERVAL_MS = 200; // 5 Hz

export function useMotionDetection(): { isDriving: boolean } {
  const [isDriving, setIsDriving] = useState(false);
  const samplesRef = useRef<number[]>([]);
  const debounceRef = useRef<DebounceState>(initDebounce());
  const lastTickRef = useRef<number>(Date.now());

  const handleSample = useCallback(({ x, y, z }: { x: number; y: number; z: number }) => {
    // Maintain a rolling window of magnitude samples.
    const samples = samplesRef.current;
    samples.push(magnitude(x, y, z));
    if (samples.length > SAMPLE_WINDOW) samples.shift();

    // Classify raw motion and advance the debounce state machine.
    const raw = classifyMotion(samples);
    const now = Date.now();
    const deltaMs = Math.max(1, now - lastTickRef.current);
    lastTickRef.current = now;

    const next = advanceDebounce(debounceRef.current, raw, deltaMs);
    debounceRef.current = next;

    const nowDriving = next.confirmed === 'driving';
    setIsDriving((prev) => (prev === nowDriving ? prev : nowDriving));
  }, []);

  useEffect(() => {
    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(handleSample);
    return () => subscription.remove();
  }, [handleSample]);

  return { isDriving };
}
