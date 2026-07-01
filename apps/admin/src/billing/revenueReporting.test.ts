import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mrrLabel,
  churnRateLabel,
  failedPaymentRateLabel,
  computeMRR,
  isChurnHealthy,
} from './revenueReporting.js';

describe('mrrLabel', () => {
  it('formats zero cents', () => assert.equal(mrrLabel(0), '$0.00'));
  it('formats 999 cents as $9.99', () => assert.equal(mrrLabel(999), '$9.99'));
  it('formats 100000 cents as $1000.00', () => assert.equal(mrrLabel(100000), '$1000.00'));
});

describe('churnRateLabel', () => {
  it('formats 0 as 0.0%', () => assert.equal(churnRateLabel(0), '0.0%'));
  it('formats 0.05 as 5.0%', () => assert.equal(churnRateLabel(0.05), '5.0%'));
  it('formats 0.123 as 12.3%', () => assert.equal(churnRateLabel(0.123), '12.3%'));
});

describe('failedPaymentRateLabel', () => {
  it('formats 0 as 0.0%', () => assert.equal(failedPaymentRateLabel(0), '0.0%'));
  it('formats 0.023 as 2.3%', () => assert.equal(failedPaymentRateLabel(0.023), '2.3%'));
});

describe('computeMRR', () => {
  it('returns 0 when no active subscribers', () => assert.equal(computeMRR(0, 999), 0));
  it('multiplies active count by price', () => assert.equal(computeMRR(10, 999), 9990));
  it('handles large subscriber counts', () => assert.equal(computeMRR(1000, 999), 999000));
});

describe('isChurnHealthy', () => {
  it('returns true at 0%', () => assert.equal(isChurnHealthy(0), true));
  it('returns true at exactly 10%', () => assert.equal(isChurnHealthy(0.1), true));
  it('returns false above 10%', () => assert.equal(isChurnHealthy(0.101), false));
});
