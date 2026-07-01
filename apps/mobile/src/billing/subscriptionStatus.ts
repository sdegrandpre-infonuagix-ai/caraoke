export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing']);

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  trialing: 'Free trial',
  past_due: 'Payment past due',
  canceled: 'Canceled',
  none: 'No subscription',
};

const VALID_STATUSES = new Set<string>(['active', 'trialing', 'past_due', 'canceled']);

export function isActive(status: SubscriptionStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function statusLabel(status: SubscriptionStatus): string {
  return STATUS_LABELS[status];
}

export function toSubscriptionStatus(raw: string | null | undefined): SubscriptionStatus {
  if (raw && VALID_STATUSES.has(raw)) return raw as SubscriptionStatus;
  return 'none';
}
