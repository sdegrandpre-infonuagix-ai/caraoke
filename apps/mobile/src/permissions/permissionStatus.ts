// Permission types and pure helpers (Story 6.3, FR35).
// Pure module — no React, no Expo APIs — so logic is unit-testable.

export type PermissionType = 'microphone' | 'location' | 'notifications';
export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface PermissionMap {
  microphone: PermissionState;
  location: PermissionState;
  notifications: PermissionState;
}

/**
 * Microphone is the ONLY hard requirement (FR35). Location and notifications
 * are optional — denial degrades gracefully (no discovery / no push).
 */
export function isRequired(type: PermissionType): boolean {
  return type === 'microphone';
}

export function permissionLabel(state: PermissionState): string {
  switch (state) {
    case 'granted':      return 'Granted';
    case 'denied':       return 'Denied — change in Settings';
    case 'undetermined': return 'Not yet requested';
  }
}

export const PERMISSION_DESCRIPTIONS: Record<PermissionType, string> = {
  microphone: 'Required for live duet voice. Your voice is live only — never recorded.',
  location: 'Optional. Enables nearby-singer discovery using a coarse area code only.',
  notifications: 'Optional. Used for invite alerts and partner-ready nudges.',
};
