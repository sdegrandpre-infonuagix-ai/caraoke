import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionEventMessage, type SubscriptionEventReason } from './webhookEvents.js';

describe('subscriptionEventMessage', () => {
  const cases: Array<[SubscriptionEventReason, string]> = [
    ['payment_failed', 'payment'],
    ['plan_changed', 'plan'],
    ['canceled', 'canceled'],
    ['renewed', 'renewed'],
  ];

  for (const [reason, keyword] of cases) {
    it(`${reason} message contains "${keyword}"`, () => {
      const msg = subscriptionEventMessage(reason);
      assert.ok(msg.length > 0);
      assert.ok(msg.toLowerCase().includes(keyword), `Expected "${keyword}" in: ${msg}`);
    });
  }
});
