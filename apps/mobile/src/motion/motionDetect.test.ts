// node --import tsx --test src/motion/motionDetect.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  magnitude,
  variance,
  classifyMotion,
  advanceDebounce,
  initDebounce,
  MOTION_VARIANCE_THRESHOLD,
  DRIVE_DEBOUNCE_MS,
  STOP_DEBOUNCE_MS,
} from './motionDetect.ts';

// ── magnitude ────────────────────────────────────────────────────────────────

test('magnitude: gravity pointing down matches 9.81', () => {
  const m = magnitude(0, 0, 9.81);
  assert.ok(Math.abs(m - 9.81) < 0.001);
});

test('magnitude: all-zero vector is 0', () => {
  assert.equal(magnitude(0, 0, 0), 0);
});

test('magnitude: 3-4-5 triple', () => {
  assert.ok(Math.abs(magnitude(3, 4, 0) - 5) < 0.001);
});

// ── variance ─────────────────────────────────────────────────────────────────

test('variance: empty array is 0', () => {
  assert.equal(variance([]), 0);
});

test('variance: single-element array is 0', () => {
  assert.equal(variance([9.81]), 0);
});

test('variance: uniform array is 0', () => {
  assert.equal(variance([5, 5, 5, 5, 5]), 0);
});

test('variance: known value [1, 2, 3] is 2/3', () => {
  const v = variance([1, 2, 3]);
  assert.ok(Math.abs(v - 2 / 3) < 0.0001);
});

test('variance: [1, 3, 5, 7] is 5', () => {
  // mean = 4, deviations = [-3, -1, 1, 3], squares = [9, 1, 1, 9], pop-var = 20/4 = 5
  assert.ok(Math.abs(variance([1, 3, 5, 7]) - 5) < 0.0001);
});

// ── classifyMotion ────────────────────────────────────────────────────────────

test('classifyMotion: uniform gravity samples → stationary', () => {
  const samples = Array.from({ length: 15 }, () => 9.81);
  assert.equal(classifyMotion(samples), 'stationary');
});

test('classifyMotion: large variance → driving', () => {
  // Alternating 9.0 and 11.0 produces variance of 1.0 (> 0.3)
  const samples = Array.from({ length: 15 }, (_, i) => (i % 2 === 0 ? 9.0 : 11.0));
  assert.equal(classifyMotion(samples), 'driving');
});

test('classifyMotion: variance above threshold → driving', () => {
  // Use a spread slightly larger than sqrt(MOTION_VARIANCE_THRESHOLD) to clear
  // floating-point rounding noise (sqrt(x)² is not guaranteed to equal x in IEEE 754).
  const spread = Math.sqrt(MOTION_VARIANCE_THRESHOLD) * 1.05;
  const samples = Array.from({ length: 14 }, (_, i) =>
    i % 2 === 0 ? 9.81 + spread : 9.81 - spread,
  );
  assert.equal(classifyMotion(samples), 'driving');
});

test('classifyMotion: empty array → stationary (variance = 0)', () => {
  assert.equal(classifyMotion([]), 'stationary');
});

// ── advanceDebounce ───────────────────────────────────────────────────────────

test('advanceDebounce: stationary init + stationary tick stays confirmed stationary', () => {
  const next = advanceDebounce(initDebounce(), 'stationary', 200);
  assert.equal(next.confirmed, 'stationary');
  assert.equal(next.pending, 'stationary');
});

test('advanceDebounce: first driving tick changes pending but not confirmed', () => {
  const next = advanceDebounce(initDebounce(), 'driving', 200);
  assert.equal(next.confirmed, 'stationary');
  assert.equal(next.pending, 'driving');
  assert.equal(next.pendingMs, 200);
});

test('advanceDebounce: accumulates pendingMs while pending matches', () => {
  let s = advanceDebounce(initDebounce(), 'driving', 1000);
  s = advanceDebounce(s, 'driving', 1000);
  assert.equal(s.confirmed, 'stationary');
  assert.equal(s.pendingMs, 2000);
});

test('advanceDebounce: confirms driving once DRIVE_DEBOUNCE_MS is reached', () => {
  // First tick: switches pending from stationary → driving (does not confirm yet).
  let s = advanceDebounce(initDebounce(), 'driving', 1);
  // Second tick: accumulates over the threshold → confirms.
  s = advanceDebounce(s, 'driving', DRIVE_DEBOUNCE_MS);
  assert.equal(s.confirmed, 'driving');
});

test('advanceDebounce: confirms driving when accumulated across multiple ticks', () => {
  let s = initDebounce();
  s = advanceDebounce(s, 'driving', 1000);
  s = advanceDebounce(s, 'driving', 1000);
  s = advanceDebounce(s, 'driving', 1001);
  assert.equal(s.confirmed, 'driving');
});

test('advanceDebounce: driving → stationary resets counter, does not immediately confirm', () => {
  // Build a properly confirmed-driving state (two ticks required).
  let s = advanceDebounce(initDebounce(), 'driving', 1);
  s = advanceDebounce(s, 'driving', DRIVE_DEBOUNCE_MS);
  assert.equal(s.confirmed, 'driving');
  // Now go stationary — should not yet confirm (STOP_DEBOUNCE_MS not reached)
  s = advanceDebounce(s, 'stationary', 1000);
  assert.equal(s.confirmed, 'driving');
  assert.equal(s.pending, 'stationary');
  assert.equal(s.pendingMs, 1000);
});

test('advanceDebounce: confirms stationary after STOP_DEBOUNCE_MS (red-light hold)', () => {
  let s = advanceDebounce(initDebounce(), 'driving', 1);
  s = advanceDebounce(s, 'driving', DRIVE_DEBOUNCE_MS);
  assert.equal(s.confirmed, 'driving');
  // Tick past the stop debounce
  s = advanceDebounce(s, 'stationary', 1);
  s = advanceDebounce(s, 'stationary', STOP_DEBOUNCE_MS);
  assert.equal(s.confirmed, 'stationary');
});

test('advanceDebounce: brief stationary blip during driving does not flicker', () => {
  // Confirm driving via two ticks.
  let s = advanceDebounce(initDebounce(), 'driving', 1);
  s = advanceDebounce(s, 'driving', DRIVE_DEBOUNCE_MS);
  assert.equal(s.confirmed, 'driving');
  // Brief stationary blip (red light, 2 s) — under STOP_DEBOUNCE_MS (5 s).
  s = advanceDebounce(s, 'stationary', 2000);
  assert.equal(s.confirmed, 'driving');
  // Resume driving — counter resets, still confirmed driving.
  s = advanceDebounce(s, 'driving', 200);
  assert.equal(s.confirmed, 'driving');
  assert.equal(s.pending, 'driving');
});

test('advanceDebounce: STOP_DEBOUNCE_MS is longer than DRIVE_DEBOUNCE_MS', () => {
  assert.ok(STOP_DEBOUNCE_MS > DRIVE_DEBOUNCE_MS);
});
