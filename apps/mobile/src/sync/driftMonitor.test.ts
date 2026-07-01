// node --import tsx --test src/sync/driftMonitor.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDrift,
  estimatePosition,
  encodePositionMsg,
  decodePositionMsg,
  DRIFT_THRESHOLD_MS,
  MAX_CORRECTION_MS,
  type PositionSample,
} from './driftMonitor.ts';

const NOW = 1_000_000; // nowServerMs

// Helper: partner sample with no latency (sampledAtServerMs === NOW)
function partnerAt(positionMs: number): PositionSample {
  return { positionMs, sampledAtServerMs: NOW };
}

// --- computeDrift ---

test('computeDrift: zero drift when positions match', () => {
  const r = computeDrift(500, partnerAt(500), NOW);
  assert.equal(r.driftMs, 0);
  assert.equal(r.needsCorrection, false);
});

test('computeDrift: positive drift when we are ahead', () => {
  const r = computeDrift(600, partnerAt(500), NOW);
  assert.equal(r.driftMs, 100);
  assert.equal(r.needsCorrection, false); // we're ahead — partner corrects itself
});

test('computeDrift: needsCorrection true when we lag beyond threshold', () => {
  const lag = DRIFT_THRESHOLD_MS + 1;
  const r = computeDrift(500 - lag, partnerAt(500), NOW);
  assert.equal(r.needsCorrection, true);
  assert.ok(r.driftMs < -DRIFT_THRESHOLD_MS);
});

test('computeDrift: needsCorrection false when drift is exactly at threshold', () => {
  const r = computeDrift(500 - DRIFT_THRESHOLD_MS, partnerAt(500), NOW);
  assert.equal(r.needsCorrection, false);
});

test('computeDrift: needsCorrection false for oversized drift (bad data, MAX_CORRECTION guard)', () => {
  const r = computeDrift(0, partnerAt(MAX_CORRECTION_MS + 1), NOW);
  assert.equal(r.needsCorrection, false);
});

test('computeDrift: correctionTargetMs is clamped to >= 0', () => {
  // Partner at position 0, we are ahead — correction target should not go negative.
  const r = computeDrift(200, partnerAt(0), NOW);
  assert.ok(r.correctionTargetMs >= 0);
});

test('computeDrift: latency compensation ages the partner sample', () => {
  // Partner sampled 500ms ago → their current position is 500ms further along.
  const partner: PositionSample = { positionMs: 1000, sampledAtServerMs: NOW - 500 };
  const r = computeDrift(1500, partner, NOW); // our pos: 1500, partner effective: 1500
  assert.ok(Math.abs(r.driftMs) < 1, `expected near-zero drift, got ${r.driftMs}`);
});

// --- estimatePosition ---

test('estimatePosition: 0 at start', () => {
  assert.equal(estimatePosition(NOW, NOW), 0);
});

test('estimatePosition: tracks elapsed time correctly', () => {
  assert.equal(estimatePosition(NOW, NOW + 3000), 3000);
});

test('estimatePosition: clamped to 0 when clock is slightly behind start', () => {
  assert.equal(estimatePosition(NOW + 10, NOW), 0);
});

// --- encode/decode round-trip ---

test('encodePositionMsg / decodePositionMsg: round-trip preserves values', () => {
  const sample: PositionSample = { positionMs: 12345, sampledAtServerMs: 9_000_000 };
  const encoded = encodePositionMsg(sample);
  const decoded = decodePositionMsg(encoded);
  assert.ok(decoded !== null);
  assert.equal(decoded!.positionMs, 12345);
  assert.equal(decoded!.sampledAtServerMs, 9_000_000);
});

test('decodePositionMsg: returns null for garbage bytes', () => {
  const garbage = new TextEncoder().encode('not json at all');
  assert.equal(decodePositionMsg(garbage), null);
});

test('decodePositionMsg: returns null for wrong message type', () => {
  const wrong = new TextEncoder().encode(JSON.stringify({ t: 'other', p: 0, s: 0 }));
  assert.equal(decodePositionMsg(wrong), null);
});

test('decodePositionMsg: returns null when fields are missing', () => {
  const partial = new TextEncoder().encode(JSON.stringify({ t: 'pos', p: 0 }));
  assert.equal(decodePositionMsg(partial), null);
});
