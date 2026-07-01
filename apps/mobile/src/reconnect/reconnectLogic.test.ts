// node --import tsx --test src/reconnect/reconnectLogic.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldGiveUp,
  backoffDelayMs,
  CONTINUITY_WINDOW_MS,
  MAX_BACKOFF_MS,
  RIFF_RECONNECTING,
  RIFF_RECONNECTED,
  RIFF_GIVE_UP,
} from './reconnectLogic.ts';

// ── shouldGiveUp ─────────────────────────────────────────────────────────────

test('shouldGiveUp: false when well within the window', () => {
  assert.equal(shouldGiveUp(0, 30_000), false);
});

test('shouldGiveUp: false one ms before the window expires', () => {
  assert.equal(shouldGiveUp(0, CONTINUITY_WINDOW_MS - 1), false);
});

test('shouldGiveUp: true at exactly the window boundary', () => {
  assert.equal(shouldGiveUp(0, CONTINUITY_WINDOW_MS), true);
});

test('shouldGiveUp: true well past the window', () => {
  assert.equal(shouldGiveUp(1_000, 1_000 + CONTINUITY_WINDOW_MS + 5_000), true);
});

test('shouldGiveUp: uses absolute timestamps correctly', () => {
  const start = 1_700_000_000_000;
  assert.equal(shouldGiveUp(start, start + CONTINUITY_WINDOW_MS - 1), false);
  assert.equal(shouldGiveUp(start, start + CONTINUITY_WINDOW_MS), true);
});

// ── backoffDelayMs ────────────────────────────────────────────────────────────

test('backoffDelayMs: attempt 0 → 1000 ms', () => {
  assert.equal(backoffDelayMs(0), 1_000);
});

test('backoffDelayMs: attempt 1 → 2000 ms', () => {
  assert.equal(backoffDelayMs(1), 2_000);
});

test('backoffDelayMs: attempt 2 → 4000 ms', () => {
  assert.equal(backoffDelayMs(2), 4_000);
});

test('backoffDelayMs: attempt 3 → 8000 ms (MAX_BACKOFF_MS)', () => {
  assert.equal(backoffDelayMs(3), MAX_BACKOFF_MS);
});

test('backoffDelayMs: attempt 10 still capped at MAX_BACKOFF_MS', () => {
  assert.equal(backoffDelayMs(10), MAX_BACKOFF_MS);
});

test('backoffDelayMs: delay is always positive', () => {
  for (let i = 0; i < 20; i++) {
    assert.ok(backoffDelayMs(i) > 0, `attempt ${i} must be positive`);
  }
});

// ── Constants and Riff messages ───────────────────────────────────────────────

test('CONTINUITY_WINDOW_MS is 60 seconds', () => {
  assert.equal(CONTINUITY_WINDOW_MS, 60_000);
});

test('MAX_BACKOFF_MS is 8 seconds', () => {
  assert.equal(MAX_BACKOFF_MS, 8_000);
});

test('RIFF_RECONNECTING is a non-empty string', () => {
  assert.ok(typeof RIFF_RECONNECTING === 'string' && RIFF_RECONNECTING.length > 0);
});

test('RIFF_RECONNECTED is a non-empty string', () => {
  assert.ok(typeof RIFF_RECONNECTED === 'string' && RIFF_RECONNECTED.length > 0);
});

test('RIFF_GIVE_UP is a non-empty string', () => {
  assert.ok(typeof RIFF_GIVE_UP === 'string' && RIFF_GIVE_UP.length > 0);
});
