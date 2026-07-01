import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isFeltTogetherHealthy, rateTrend, windowSummary } from './dashboardData.js';

describe('isFeltTogetherHealthy', () => {
  it('returns true at exactly 60%', () => assert.equal(isFeltTogetherHealthy(0.6), true));
  it('returns true above 60%', () => assert.equal(isFeltTogetherHealthy(0.85), true));
  it('returns false below 60%', () => assert.equal(isFeltTogetherHealthy(0.55), false));
});

describe('rateTrend', () => {
  it('returns stable when rates are within 2%', () => {
    assert.equal(rateTrend(0.72, 0.71), 'stable');
  });

  it('returns improving when 7d > 30d by more than 2%', () => {
    assert.equal(rateTrend(0.80, 0.70), 'improving');
  });

  it('returns declining when 7d < 30d by more than 2%', () => {
    assert.equal(rateTrend(0.60, 0.75), 'declining');
  });
});

describe('windowSummary', () => {
  it('includes percentage, window days, and counts', () => {
    const summary = windowSummary({ rate: 0.72, yesCount: 18, totalResponded: 25, windowDays: 7 });
    assert.ok(summary.includes('72%'), `missing pct: ${summary}`);
    assert.ok(summary.includes('7 days'), `missing days: ${summary}`);
    assert.ok(summary.includes('18/25'), `missing counts: ${summary}`);
  });
});
