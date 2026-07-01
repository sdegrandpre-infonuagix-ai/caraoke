import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isActive,
  statusLabel,
  toSubscriptionStatus,
  type SubscriptionStatus,
} from './subscriptionStatus.js';

describe('isActive', () => {
  it('returns true for active', () => {
    assert.equal(isActive('active'), true);
  });

  it('returns true for trialing', () => {
    assert.equal(isActive('trialing'), true);
  });

  it('returns false for past_due', () => {
    assert.equal(isActive('past_due'), false);
  });

  it('returns false for canceled', () => {
    assert.equal(isActive('canceled'), false);
  });

  it('returns false for none', () => {
    assert.equal(isActive('none'), false);
  });
});

describe('statusLabel', () => {
  const cases: Array<[SubscriptionStatus, string]> = [
    ['active', 'Active'],
    ['trialing', 'Free trial'],
    ['past_due', 'Payment past due'],
    ['canceled', 'Canceled'],
    ['none', 'No subscription'],
  ];

  for (const [status, expected] of cases) {
    it(`returns "${expected}" for ${status}`, () => {
      assert.equal(statusLabel(status), expected);
    });
  }
});

describe('toSubscriptionStatus', () => {
  it('passes through valid status strings', () => {
    assert.equal(toSubscriptionStatus('active'), 'active');
    assert.equal(toSubscriptionStatus('trialing'), 'trialing');
    assert.equal(toSubscriptionStatus('past_due'), 'past_due');
    assert.equal(toSubscriptionStatus('canceled'), 'canceled');
  });

  it('returns none for null', () => {
    assert.equal(toSubscriptionStatus(null), 'none');
  });

  it('returns none for undefined', () => {
    assert.equal(toSubscriptionStatus(undefined), 'none');
  });

  it('returns none for unknown string', () => {
    assert.equal(toSubscriptionStatus('incomplete'), 'none');
    assert.equal(toSubscriptionStatus('unpaid'), 'none');
    assert.equal(toSubscriptionStatus(''), 'none');
  });
});
