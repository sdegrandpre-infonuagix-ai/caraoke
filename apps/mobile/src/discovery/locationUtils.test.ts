// node --import tsx --test src/discovery/locationUtils.test.ts
//
// Pure unit tests for the Plus Code coarsening logic (Story 5.3, FR29, NFR9).
// Verifies: output format, coarseness guarantee (< 5km apart → same code),
// and that distinct city-level areas produce different codes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCoarsePlusCode, COARSE_CODE_LENGTH } from './locationUtils.ts';

test('COARSE_CODE_LENGTH is 6 (0.05° ≈ 5.5 km cells)', () => {
  assert.equal(COARSE_CODE_LENGTH, 6);
});

test('toCoarsePlusCode: result contains the Plus Code separator "+"', () => {
  const code = toCoarsePlusCode(45.5231, -73.5589); // Montréal
  assert.ok(code.includes('+'), `Expected "+" in code, got: ${code}`);
});

test('toCoarsePlusCode: "+" separator is always at position 8 (OLC spec)', () => {
  const code = toCoarsePlusCode(48.8566, 2.3522); // Paris
  assert.equal(code.indexOf('+'), 8, `Plus Code separator position wrong: ${code}`);
});

test('toCoarsePlusCode: last two digits before "+" are "0" for 6-char code (no sub-digit precision)', () => {
  // A 6-char OLC pads positions 7 and 8 (before +) with '0' because no data at that resolution.
  const code = toCoarsePlusCode(51.5074, -0.1278); // London
  const before = code.slice(0, 8);
  assert.equal(before.slice(-2), '00', `Expected trailing zeros for coarse code, got: ${before}`);
});

test('toCoarsePlusCode: two coordinates within the same ~5km cell produce identical code', () => {
  // Both points are within [45.000°, 45.050°) lat × [−73.050°, −73.000°) lng
  const code1 = toCoarsePlusCode(45.025, -73.025);
  const code2 = toCoarsePlusCode(45.040, -73.010);
  assert.equal(code1, code2, 'Nearby coordinates must share the same coarse Plus Code');
});

test('toCoarsePlusCode: city-level distance produces different codes', () => {
  const montreal = toCoarsePlusCode(45.5231, -73.5589);
  const paris = toCoarsePlusCode(48.8566, 2.3522);
  assert.notEqual(montreal, paris);
});

test('toCoarsePlusCode: deterministic — same input always returns same output', () => {
  const a = toCoarsePlusCode(45.5231, -73.5589);
  const b = toCoarsePlusCode(45.5231, -73.5589);
  assert.equal(a, b);
});
