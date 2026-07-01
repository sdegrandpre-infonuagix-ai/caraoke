import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAmount,
  formatInvoiceDate,
  invoiceStatusLabel,
  invoiceRowSummary,
} from './invoiceFormatter.js';
import type { InvoiceSummary } from '../api/billing.js';

describe('formatAmount', () => {
  it('formats cents as dollars with symbol', () => {
    assert.equal(formatAmount(999, 'cad'), '$9.99 CAD');
  });

  it('formats USD', () => {
    assert.equal(formatAmount(1299, 'usd'), '$12.99 USD');
  });

  it('formats EUR', () => {
    assert.equal(formatAmount(899, 'eur'), '€8.99 EUR');
  });

  it('formats GBP', () => {
    assert.equal(formatAmount(799, 'gbp'), '£7.99 GBP');
  });

  it('handles zero', () => {
    assert.equal(formatAmount(0, 'usd'), '$0.00 USD');
  });

  it('handles unknown currency gracefully', () => {
    const result = formatAmount(500, 'xyz');
    assert.ok(result.includes('5.00'));
    assert.ok(result.includes('XYZ'));
  });
});

describe('formatInvoiceDate', () => {
  it('formats an ISO date correctly', () => {
    assert.equal(formatInvoiceDate('2026-07-01T00:00:00.000Z'), 'Jul 1, 2026');
  });

  it('handles January', () => {
    assert.equal(formatInvoiceDate('2026-01-15T00:00:00.000Z'), 'Jan 15, 2026');
  });

  it('handles December', () => {
    assert.equal(formatInvoiceDate('2026-12-31T00:00:00.000Z'), 'Dec 31, 2026');
  });
});

describe('invoiceStatusLabel', () => {
  const cases: Array<[string, string]> = [
    ['paid', 'Paid'],
    ['open', 'Due'],
    ['void', 'Voided'],
    ['uncollectible', 'Uncollectible'],
  ];

  for (const [status, expected] of cases) {
    it(`returns "${expected}" for ${status}`, () => {
      assert.equal(invoiceStatusLabel(status), expected);
    });
  }

  it('returns Unknown for unrecognized status', () => {
    assert.equal(invoiceStatusLabel('draft'), 'Unknown');
  });
});

describe('invoiceRowSummary', () => {
  const invoice: InvoiceSummary = {
    id: 'in_001',
    amount: 999,
    currency: 'cad',
    status: 'paid',
    date: '2026-06-01T00:00:00.000Z',
    receiptUrl: null,
    description: 'Caraoke Monthly',
  };

  it('includes date, amount, and status', () => {
    const summary = invoiceRowSummary(invoice);
    assert.ok(summary.includes('Jun 1, 2026'), `missing date in: ${summary}`);
    assert.ok(summary.includes('$9.99 CAD'), `missing amount in: ${summary}`);
    assert.ok(summary.includes('Paid'), `missing status in: ${summary}`);
  });
});
