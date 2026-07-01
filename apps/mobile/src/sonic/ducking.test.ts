// node --import tsx --test src/sonic/ducking.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  duckGains,
  rampGainDb,
  higherPriority,
  DEFAULT_DUCK,
  PRIORITY,
  type SoundLayer,
} from './ducking.ts';

test('duckGains: unity when Riff is silent', () => {
  const g = duckGains(false);
  assert.equal(g.riff, 0);
  assert.equal(g.partner, 0);
  assert.equal(g.backing, 0);
  assert.equal(g.ambient, 0);
});

test('duckGains: lower backing ~12dB and partner ~6dB when Riff speaks', () => {
  const g = duckGains(true);
  assert.equal(g.riff, 0, 'Riff stays at unity — it IS speaking');
  assert.equal(g.partner, DEFAULT_DUCK.partnerDb); // -6
  assert.equal(g.backing, DEFAULT_DUCK.backingDb); // -12
  assert.equal(g.ambient, DEFAULT_DUCK.ambientDb); // -12
});

test('duckGains: respects custom DuckConfig', () => {
  const cfg = { backingDb: -10, partnerDb: -4, ambientDb: -10, restoreMs: 300 };
  const g = duckGains(true, cfg);
  assert.equal(g.backing, -10);
  assert.equal(g.partner, -4);
});

test('rampGainDb: returns fromDb at elapsed=0', () => {
  assert.equal(rampGainDb(-12, 0, 0, 500), -12);
});

test('rampGainDb: returns toDb at elapsed>=duration', () => {
  assert.equal(rampGainDb(-12, 0, 500, 500), 0);
  assert.equal(rampGainDb(-12, 0, 999, 500), 0);
});

test('rampGainDb: midpoint is halfway between from and to', () => {
  const mid = rampGainDb(-12, 0, 250, 500);
  assert.ok(Math.abs(mid - (-6)) < 0.01, `expected -6, got ${mid}`);
});

test('rampGainDb: handles zero duration gracefully', () => {
  assert.equal(rampGainDb(-12, 0, 0, 0), 0);
});

test('higherPriority: Riff beats everything', () => {
  const layers: SoundLayer[] = ['partner', 'backing', 'ambient'];
  for (const l of layers) assert.equal(higherPriority('riff', l), 'riff');
});

test('higherPriority: partner beats backing and ambient', () => {
  assert.equal(higherPriority('partner', 'backing'), 'partner');
  assert.equal(higherPriority('partner', 'ambient'), 'partner');
});

test('higherPriority: backing beats ambient', () => {
  assert.equal(higherPriority('backing', 'ambient'), 'backing');
});

test('PRIORITY list has all four layers', () => {
  const expected: SoundLayer[] = ['riff', 'partner', 'backing', 'ambient'];
  assert.deepEqual([...PRIORITY], expected);
});
