import { API_BASE } from './config.js';

export interface SubscriptionStatusResponse {
  subscribed: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
}

export async function createSetupIntent(idToken: string): Promise<{ clientSecret: string }> {
  const res = await fetch(`${API_BASE}/billing/setup-intent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const json = (await res.json()) as { data: { clientSecret: string } };
  return json.data;
}

export async function subscribe(
  idToken: string,
  paymentMethodId: string,
): Promise<{ subscriptionId: string; status: string; currentPeriodEnd: string }> {
  const res = await fetch(`${API_BASE}/billing/subscribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId }),
  });
  const json = (await res.json()) as {
    data: { subscriptionId: string; status: string; currentPeriodEnd: string };
  };
  return json.data;
}

export async function getSubscriptionStatus(
  idToken: string,
): Promise<SubscriptionStatusResponse> {
  const res = await fetch(`${API_BASE}/billing/status`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const json = (await res.json()) as { data: SubscriptionStatusResponse };
  return json.data;
}

export async function cancelSubscription(
  idToken: string,
): Promise<{ status: string; currentPeriodEnd: string }> {
  const res = await fetch(`${API_BASE}/billing/subscription`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const json = (await res.json()) as { data: { status: string; currentPeriodEnd: string } };
  return json.data;
}

export async function changePlan(
  idToken: string,
  priceId: string,
): Promise<{ status: string; currentPeriodEnd: string }> {
  const res = await fetch(`${API_BASE}/billing/subscription/plan`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });
  const json = (await res.json()) as { data: { status: string; currentPeriodEnd: string } };
  return json.data;
}

export interface InvoiceSummary {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  receiptUrl: string | null;
  description: string | null;
}

export async function getBillingHistory(idToken: string): Promise<InvoiceSummary[]> {
  const res = await fetch(`${API_BASE}/billing/history`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const json = (await res.json()) as { data: { invoices: InvoiceSummary[] } };
  return json.data.invoices;
}
