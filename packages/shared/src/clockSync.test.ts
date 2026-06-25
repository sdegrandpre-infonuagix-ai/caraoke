import { describe, it, expect } from 'vitest';
import {
  estimateOffsetMs,
  medianOffsetMs,
  bestSampleOffsetMs,
  msUntil,
  serverNow,
  roundTripMs,
} from './clockSync.js';

describe('clock-sync primitive (AR10/NFR1)', () => {
  it('estimateOffsetMs subtracts half the round-trip', () => {
    // rtt = 100ms; server is 1000ms ahead of the midpoint.
    expect(estimateOffsetMs({ t0: 0, serverTime: 1050, t1: 100 })).toBe(1000);
    expect(roundTripMs({ t0: 0, serverTime: 1050, t1: 100 })).toBe(100);
  });

  it('bestSampleOffsetMs uses the lowest-RTT sample (NTP best sample)', () => {
    const samples = [
      { t0: 0, serverTime: 1200, t1: 400 }, // rtt 400, offset 1000
      { t0: 0, serverTime: 1010, t1: 20 }, // rtt 20,  offset 1000 (best/cleanest)
      { t0: 0, serverTime: 5000, t1: 600 }, // rtt 600 spike
    ];
    expect(bestSampleOffsetMs(samples)).toBe(1000);
  });

  it('medianOffsetMs is robust to a spike', () => {
    const samples = [
      { t0: 0, serverTime: 1050, t1: 100 }, // 1000
      { t0: 0, serverTime: 1060, t1: 100 }, // 1010
      { t0: 0, serverTime: 6000, t1: 100 }, // 5950 spike
    ];
    expect(medianOffsetMs(samples)).toBe(1010);
  });

  it('serverNow adds the offset to the local clock', () => {
    expect(serverNow(4000, 1000)).toBe(5000);
  });

  it('msUntil converts a server-time target to a local wait, clamped at 0', () => {
    // offset +1000: local clock is 1000ms behind server.
    // target server 8000 -> local target 7000; local now 4000 -> wait 3000.
    expect(msUntil(8000, 4000, 1000)).toBe(3000);
    expect(msUntil(8000, 9000, 1000)).toBe(0);
  });

  it('empty sample sets yield a zero offset', () => {
    expect(medianOffsetMs([])).toBe(0);
    expect(bestSampleOffsetMs([])).toBe(0);
  });
});
