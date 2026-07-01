export type AccountStatus = 'active' | 'suspended';

/** Derive account status from suspendedAt timestamp. */
export function accountStatus(suspendedAt: string | null | undefined): AccountStatus {
  return suspendedAt ? 'suspended' : 'active';
}

/** Human-readable label for an account status. */
export function accountStatusLabel(suspendedAt: string | null | undefined): string {
  return suspendedAt ? 'Suspended' : 'Active';
}

/** Whether the account is currently suspended. */
export function isSuspended(suspendedAt: string | null | undefined): boolean {
  return Boolean(suspendedAt);
}

/** Confirmation message shown before suspending an account. */
export function suspendConfirmMessage(displayName: string | null): string {
  const name = displayName ?? 'this user';
  return `Suspend ${name}? They will lose access to Caraoke immediately.`;
}

/** Confirmation message shown before reinstating an account. */
export function reinstateConfirmMessage(displayName: string | null): string {
  const name = displayName ?? 'this user';
  return `Reinstate ${name}? They will regain full access to Caraoke.`;
}
