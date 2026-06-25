// Runnable with: npx tsx tools/phase0-harness/app/src/lib/simultaneousStart.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateOffsetMs,
  medianOffsetMs,
  computeStartAt,
  msUntilStart,
} from './simultaneousStart.ts';

test('estimateOffsetMs subtracts half the round-trip', () => {
  // rtt = 100ms; server is 1000ms ahead of the midpoint.
  assert.equal(estimateOffsetMs({ t0: 0, serverTime: 1050, t1: 100 }), 1000);
});

test('medianOffsetMs is robust to a spike', () => {
  const samples = [
    { t0: 0, serverTime: 1050, t1: 100 }, // offset 1000
    { t0: 0, serverTime: 1060, t1: 100 }, // offset 1010
    { t0: 0, serverTime: 6000, t1: 100 }, // offset 5950 (spike)
  ];
  assert.equal(medianOffsetMs(samples), 1010);
});

test('computeStartAt adds preroll', () => {
  assert.equal(computeStartAt(5000, 3000), 8000);
});

test('msUntilStart converts coordinator target to local wait, clamped at 0', () => {
  // Local clock is 1000ms behind the server (offset +1000).
  // startAt (server) = 8000 → local target = 7000. local now = 4000 → wait 3000.
  assert.equal(msUntilStart(8000, 4000, 1000), 3000);
  // If the target is already past, wait is 0 (don't go negative).
  assert.equal(msUntilStart(8000, 9000, 1000), 0);
});
