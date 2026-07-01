import { useCallback, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useDiscoveryStore } from '../stores/useDiscoveryStore';
import { useAuthStore } from '../stores/useAuthStore';
import { publishLocation, revokeLocation } from '../api/discovery';
import { toCoarsePlusCode } from './locationUtils';

// Re-publish just inside the Redis TTL (300s) to keep the entry alive while driving.
const PUBLISH_INTERVAL_MS = 4 * 60 * 1000;  // 4 min
// Request the lowest accuracy available — we only need a coarse area, not a street address.
const LOCATION_OPTIONS: Location.LocationOptions = { accuracy: Location.Accuracy.Lowest };

/**
 * Publishes the user's coarse Plus-Code area to the backend while discovery is active.
 * Precise coordinates never leave the device — only the Plus Code is transmitted (NFR9).
 * Entry auto-expires in Redis when the interval stops (no perpetual trail, FR29).
 */
export function useLocationPublisher() {
  const discoverabilityEnabled = useDiscoveryStore((s) => s.discoverabilityEnabled);
  const is18Plus = useDiscoveryStore((s) => s.is18Plus);
  const idToken = useAuthStore((s) => s.idToken);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPublisher = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const active = discoverabilityEnabled && is18Plus === true && Boolean(idToken);

    if (!active) {
      clearPublisher();
      if (idToken) revokeLocation(idToken).catch(() => {});
      return;
    }

    const publish = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync(LOCATION_OPTIONS);
      // Convert to coarse Plus Code before sending — precise coords stay on device (NFR9).
      const plusCode = toCoarsePlusCode(loc.coords.latitude, loc.coords.longitude);
      await publishLocation(idToken!, plusCode);
    };

    void publish();
    intervalRef.current = setInterval(() => void publish(), PUBLISH_INTERVAL_MS);

    return clearPublisher;
  }, [discoverabilityEnabled, is18Plus, idToken, clearPublisher]);
}
