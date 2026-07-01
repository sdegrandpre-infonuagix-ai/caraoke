import type { InvoiceSummary } from '../api/billing.js';

const UTC_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  cad: '$',
  eur: '€',
  gbp: '£',
};

/** Format a Stripe amount-in-cents as a human-readable price string (e.g. "$9.99 CAD"). */
export function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] ?? '';
  const dollars = (amount / 100).toFixed(2);
  return `${symbol}${dollars} ${currency.toUpperCase()}`;
}

/** Format an ISO date string as "Mon D, YYYY" in UTC. */
export function formatInvoiceDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${UTC_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Human-readable label for an invoice status. */
export function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Paid',
    open: 'Due',
    void: 'Voided',
    uncollectible: 'Uncollectible',
  };
  return labels[status] ?? 'Unknown';
}

/** One-line summary for a billing history row. */
export function invoiceRowSummary(invoice: InvoiceSummary): string {
  const date = formatInvoiceDate(invoice.date);
  const amount = formatAmount(invoice.amount, invoice.currency);
  const label = invoiceStatusLabel(invoice.status);
  return `${date} — ${amount} — ${label}`;
}
