// node --import tsx --test src/sync/scheduledStart.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localDelayMs,
  hasPrebufferWindow,
  prebufferServerMs,
  PRE_ROLL_MS,
  MIN_SCHEDULE_MS,
} from './scheduledStart.ts';

// Fixed test inputs
const NOW = 1_000_000; // local ms
const OFFSET = 50;     // server is 50ms ahead of local
// correctedNow = NOW + OFFSET = 1_000_050

test('localDelayMs: T in the future returns positive delay', () => {
  const startAt = NOW + OFFSET + 500; // 500ms from correctedNow
  assert.equal(localDelayMs(startAt, NOW, OFFSET), 500);
});

test('localDelayMs: T in the past returns 0 (clamped)', () => {
  const startAt = NOW + OFFSET - 200; // 200ms in the past
  assert.equal(localDelayMs(startAt, NOW, OFFSET), MIN_SCHEDULE_MS);
});

test('localDelayMs: T exactly now returns 0', () => {
  const startAt = NOW + OFFSET; // exactly correctedNow
  assert.equal(localDelayMs(startAt, NOW, OFFSET), 0);
});

test('localDelayMs: negative offset (local ahead of server)', () => {
  const offset = -100; // local is 100ms ahead
  const startAt = NOW - 100 + 1000; // 1000ms from correctedNow
  assert.equal(localDelayMs(startAt, NOW, offset), 1000);
});

test('hasPrebufferWindow: true when delay > PRE_ROLL_MS', () => {
  const startAt = NOW + OFFSET + PRE_ROLL_MS + 1;
  assert.equal(hasPrebufferWindow(startAt, NOW, OFFSET), true);
});

test('hasPrebufferWindow: true when delay === PRE_ROLL_MS', () => {
  const startAt = NOW + OFFSET + PRE_ROLL_MS;
  assert.equal(hasPrebufferWindow(startAt, NOW, OFFSET), true);
});

test('hasPrebufferWindow: false when delay < PRE_ROLL_MS', () => {
  const startAt = NOW + OFFSET + PRE_ROLL_MS - 1;
  assert.equal(hasPrebufferWindow(startAt, NOW, OFFSET), false);
});

test('hasPrebufferWindow: false when T is in the past', () => {
  const startAt = NOW + OFFSET - 500;
  assert.equal(hasPrebufferWindow(startAt, NOW, OFFSET), false);
});

test('prebufferServerMs: returns startAt minus PRE_ROLL_MS', () => {
  const startAt = 5_000_000;
  assert.equal(prebufferServerMs(startAt), startAt - PRE_ROLL_MS);
});

test('PRE_ROLL_MS is 2000 (2 seconds)', () => {
  assert.equal(PRE_ROLL_MS, 2_000);
});
