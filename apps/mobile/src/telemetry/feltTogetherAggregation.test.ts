import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeRate, rateLabel, rateSummary } from './feltTogetherAggregation.js';
import type { FeltSentiment } from './feltTogether.js';

describe('computeRate', () => {
  it('returns 1 when all responded yes', () => {
    const sentiments: FeltSentiment[] = ['yes', 'yes', 'yes'];
    assert.equal(computeRate(sentiments), 1);
  });

  it('returns 0 when all responded no', () => {
    const sentiments: FeltSentiment[] = ['no', 'no', 'no'];
    assert.equal(computeRate(sentiments), 0);
  });

  it('computes correct fraction', () => {
    const sentiments: FeltSentiment[] = ['yes', 'yes', 'no', 'yes'];
    assert.equal(computeRate(sentiments), 0.75);
  });

  it('excludes unclear and no_response from denominator', () => {
    const sentiments: FeltSentiment[] = ['yes', 'unclear', 'no_response', 'yes'];
    assert.equal(computeRate(sentiments), 1);
  });

  it('returns 0 for empty input', () => {
    assert.equal(computeRate([]), 0);
  });

  it('returns 0 when only unclear/no_response', () => {
    const sentiments: FeltSentiment[] = ['unclear', 'no_response'];
    assert.equal(computeRate(sentiments), 0);
  });
});

describe('rateLabel', () => {
  it('formats 0.72 as "72%"', () => {
    assert.equal(rateLabel(0.72), '72%');
  });

  it('formats 1 as "100%"', () => {
    assert.equal(rateLabel(1), '100%');
  });

  it('formats 0 as "0%"', () => {
    assert.equal(rateLabel(0), '0%');
  });

  it('rounds correctly', () => {
    assert.equal(rateLabel(0.555), '56%');
  });
});

describe('rateSummary', () => {
  it('produces a human-readable summary', () => {
    const summary = rateSummary(0.8, 25);
    assert.ok(summary.includes('80%'), `missing pct in: ${summary}`);
    assert.ok(summary.includes('25'), `missing total in: ${summary}`);
  });

  it('handles zero responses', () => {
    const summary = rateSummary(0, 0);
    assert.ok(summary.includes('0%'));
  });
});
