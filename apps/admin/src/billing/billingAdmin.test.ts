import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { disputeStatusLabel, refundLabel, isAtRiskStatus } from './billingAdmin.js';

describe('disputeStatusLabel', () => {
  it('labels needs_response', () => assert.equal(disputeStatusLabel('needs_response'), 'Needs response'));
  it('labels won', () => assert.equal(disputeStatusLabel('won'), 'Won'));
  it('labels lost', () => assert.equal(disputeStatusLabel('lost'), 'Lost'));
  it('labels unknown gracefully', () => assert.equal(disputeStatusLabel('other'), 'Unknown'));
});

describe('refundLabel', () => {
  it('formats CAD refund', () => assert.equal(refundLabel(999, 'cad'), 'Refund: $9.99 CAD'));
  it('formats USD refund', () => assert.equal(refundLabel(1299, 'usd'), 'Refund: $12.99 USD'));
  it('handles zero cents', () => assert.ok(refundLabel(0, 'cad').includes('0.00')));
});

describe('isAtRiskStatus', () => {
  it('returns true for past_due', () => assert.equal(isAtRiskStatus('past_due'), true));
  it('returns true for canceled', () => assert.equal(isAtRiskStatus('canceled'), true));
  it('returns false for active', () => assert.equal(isAtRiskStatus('active'), false));
  it('returns false for null', () => assert.equal(isAtRiskStatus(null), false));
});
