// Permission aggregation hook (Story 6.3, FR35).
// Checks all three permission states independently — each can be granted/denied/undetermined
// without affecting the others. Mic is the only hard requirement.

import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useMicConsent } from '../voice/consentStore';
import type { PermissionMap, PermissionState } from './permissionStatus';

function expoStatusToState(granted: boolean, status: string): PermissionState {
  if (granted) return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export interface UsePermissionsResult {
  /** Current permission state for each type — refreshed on mount and after requests. */
  perms: PermissionMap;
  /** Re-check OS permission states (e.g. after the user returns from system Settings). */
  refresh: () => Promise<void>;
  /** Request foreground location permission just-in-time. */
  requestLocation: () => Promise<void>;
  /** Request notification permission just-in-time. */
  requestNotifications: () => Promise<void>;
}

export function usePermissions(): UsePermissionsResult {
  const micConsented = useMicConsent((s) => s.micConsented);
  const [perms, setPerms] = useState<PermissionMap>({
    microphone: 'undetermined',
    location: 'undetermined',
    notifications: 'undetermined',
  });

  const refresh = useCallback(async () => {
    const [locStatus, notifStatus] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Notifications.getPermissionsAsync(),
    ]);
    setPerms({
      // Mic OS prompt fires via LiveKit at room join; in-app consent is the user-visible proxy.
      microphone: micConsented ? 'granted' : 'undetermined',
      location: expoStatusToState(locStatus.granted, locStatus.status),
      notifications: expoStatusToState(notifStatus.granted, notifStatus.status as string),
    });
  }, [micConsented]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestLocation = useCallback(async () => {
    await Location.requestForegroundPermissionsAsync();
    await refresh();
  }, [refresh]);

  const requestNotifications = useCallback(async () => {
    await Notifications.requestPermissionsAsync();
    await refresh();
  }, [refresh]);

  return { perms, refresh, requestLocation, requestNotifications };
}
