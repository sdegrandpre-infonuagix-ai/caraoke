import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPeriodEnd,
  confirmCancelPrompt,
  cancellationMessage,
  isCancelPending,
  planChangedMessage,
} from './planManagement.js';

describe('formatPeriodEnd', () => {
  it('formats an ISO date string correctly', () => {
    assert.equal(formatPeriodEnd('2026-08-15T00:00:00.000Z'), 'Aug 15, 2026');
  });

  it('handles month boundary', () => {
    assert.equal(formatPeriodEnd('2026-01-01T00:00:00.000Z'), 'Jan 1, 2026');
  });

  it('handles December', () => {
    assert.equal(formatPeriodEnd('2026-12-31T00:00:00.000Z'), 'Dec 31, 2026');
  });
});

describe('confirmCancelPrompt', () => {
  it('returns a non-empty string', () => {
    const msg = confirmCancelPrompt();
    assert.ok(msg.length > 0);
    assert.ok(msg.toLowerCase().includes('cancel'));
  });
});

describe('cancellationMessage', () => {
  it('includes the formatted date', () => {
    const msg = cancellationMessage('2026-09-01T00:00:00.000Z');
    assert.ok(msg.includes('Sep 1, 2026'), `Expected date in: ${msg}`);
  });

  it('mentions access', () => {
    const msg = cancellationMessage('2026-09-01T00:00:00.000Z');
    assert.ok(msg.toLowerCase().includes('access'));
  });
});

describe('isCancelPending', () => {
  it('returns true for active (cancel_at_period_end set but still active)', () => {
    assert.equal(isCancelPending('active'), true);
  });

  it('returns true for trialing', () => {
    assert.equal(isCancelPending('trialing'), true);
  });

  it('returns false for canceled', () => {
    assert.equal(isCancelPending('canceled'), false);
  });

  it('returns false for none', () => {
    assert.equal(isCancelPending('none'), false);
  });
});

describe('planChangedMessage', () => {
  it('includes the price id', () => {
    const msg = planChangedMessage('price_caraoke_annual');
    assert.ok(msg.includes('price_caraoke_annual'), `Expected price in: ${msg}`);
  });
});
