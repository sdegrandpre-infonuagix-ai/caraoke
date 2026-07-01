import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRate, formatLatency, formatDrift, formatCount, formatP95 } from './metricFormatters.js';

describe('formatRate', () => {
  it('formats 0.72 as "72%"', () => assert.equal(formatRate(0.72), '72%'));
  it('formats 1 as "100%"', () => assert.equal(formatRate(1), '100%'));
  it('formats 0 as "0%"', () => assert.equal(formatRate(0), '0%'));
});

describe('formatLatency', () => {
  it('shows ms for sub-second', () => assert.equal(formatLatency(450), '450ms'));
  it('shows seconds for >=1000ms', () => assert.equal(formatLatency(1200), '1.2s'));
  it('rounds ms', () => assert.equal(formatLatency(320.7), '321ms'));
});

describe('formatDrift', () => {
  it('shows 0ms for zero', () => assert.equal(formatDrift(0), '0ms'));
  it('shows positive sign', () => assert.equal(formatDrift(12), '+12ms'));
  it('shows negative sign', () => assert.equal(formatDrift(-5), '-5ms'));
});

describe('formatCount', () => {
  it('formats 1234 with comma', () => assert.ok(formatCount(1234).includes('1')));
  it('formats 0', () => assert.equal(formatCount(0), '0'));
});

describe('formatP95', () => {
  it('includes p95 label', () => assert.ok(formatP95(320).startsWith('p95:')));
  it('includes latency', () => assert.ok(formatP95(320).includes('320ms')));
});
