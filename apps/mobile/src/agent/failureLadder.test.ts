// node --import tsx --test src/agent/failureLadder.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialLadder,
  advanceLadder,
  confirmLadder,
  rejectLadder,
  isTerminal,
  MAX_MISSES,
} from './failureLadder.ts';

test('initialLadder starts listening with 0 misses', () => {
  const s = initialLadder();
  assert.equal(s.rung, 'listening');
  assert.equal(s.misses, 0);
  assert.equal(s.pendingTrackId, null);
});

test('advanceLadder: confirm moves to confirming and stores trackId', () => {
  const s = advanceLadder(initialLadder(), 'confirm', 'track-1', 'spotify:track:1');
  assert.equal(s.rung, 'confirming');
  assert.equal(s.pendingTrackId, 'track-1');
  assert.equal(s.pendingTrackUri, 'spotify:track:1');
  assert.equal(s.misses, 0);
});

test('advanceLadder: clarify moves to clarifying', () => {
  const s = advanceLadder(initialLadder(), 'clarify');
  assert.equal(s.rung, 'clarifying');
  assert.equal(s.pendingTrackId, null);
});

test('advanceLadder: re_ask increments misses and stays on re_asking before limit', () => {
  let s = initialLadder();
  s = advanceLadder(s, 're_ask');
  assert.equal(s.rung, 're_asking');
  assert.equal(s.misses, 1);
});

test('advanceLadder: re_ask escalates to exiting at MAX_MISSES', () => {
  let s = initialLadder();
  for (let i = 0; i < MAX_MISSES; i++) s = advanceLadder(s, 're_ask');
  assert.equal(s.rung, 'exiting');
  assert.equal(s.misses, MAX_MISSES);
});

test('advanceLadder: exit action goes directly to exiting', () => {
  const s = advanceLadder(initialLadder(), 'exit');
  assert.equal(s.rung, 'exiting');
});

test('confirmLadder moves to done', () => {
  const confirming = advanceLadder(initialLadder(), 'confirm', 'track-1', 'spotify:track:1');
  const done = confirmLadder(confirming);
  assert.equal(done.rung, 'done');
});

test('rejectLadder increments misses and returns to listening before limit', () => {
  const confirming = advanceLadder(initialLadder(), 'confirm', 'track-1', 'spotify:track:1');
  const rejected = rejectLadder(confirming);
  assert.equal(rejected.rung, 'listening');
  assert.equal(rejected.misses, 1);
  assert.equal(rejected.pendingTrackId, null);
});

test('rejectLadder exits when already at MAX_MISSES - 1 misses', () => {
  // Simulate a confirming state that already has MAX_MISSES-1 accumulated misses
  // (advanceLadder 'confirm' resets misses; we set them manually to test the boundary).
  const s = {
    rung: 'confirming' as const,
    misses: MAX_MISSES - 1,
    pendingTrackId: 't',
    pendingTrackUri: 'u',
  };
  const rejected = rejectLadder(s);
  assert.equal(rejected.rung, 'exiting');
  assert.equal(rejected.misses, MAX_MISSES);
});

test('isTerminal: done and exiting are terminal', () => {
  assert.equal(isTerminal({ rung: 'done', misses: 0, pendingTrackId: null, pendingTrackUri: null }), true);
  assert.equal(isTerminal({ rung: 'exiting', misses: 3, pendingTrackId: null, pendingTrackUri: null }), true);
});

test('isTerminal: non-terminal rungs return false', () => {
  const rungs = ['listening', 'processing', 'confirming', 'clarifying', 're_asking'] as const;
  for (const rung of rungs) {
    assert.equal(isTerminal({ rung, misses: 0, pendingTrackId: null, pendingTrackUri: null }), false, rung);
  }
});
