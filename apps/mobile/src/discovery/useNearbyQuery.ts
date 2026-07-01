// Nearby-singer query hook (Story 5.4, FR28/FR29/UX-DR8).
// Intercepts "any Caraokes nearby?" voice transcripts, fetches coarse-area matches from
// the discovery API, and reads the result aloud via Riff. Always returns true to consume
// the transcript so the xAI agent (Story 4.3) is not invoked for nearby queries.

import { useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/useAuthStore';
import { useDiscoveryStore } from '../stores/useDiscoveryStore';
import { useLocale } from '../i18n/useLocale';
import { sonicEngine } from '../sonic';
import { getNearbyUsers } from '../api/discovery';
import { toCoarsePlusCode } from './locationUtils';
import { classifyNearbyIntent, buildNearbyResponse } from './nearbyIntent';

export interface NearbyQueryActions {
  /**
   * Classify the transcript as a nearby-singer query and, if matched, fetch and speak
   * the result. Returns `true` when the transcript was consumed (so callers skip the
   * general xAI pipeline). Returns `false` when the transcript is unrelated.
   */
  handleTranscript: (transcript: string) => Promise<boolean>;
}

export function useNearbyQuery(): NearbyQueryActions {
  const idToken = useAuthStore((s) => s.idToken);
  const discoverabilityEnabled = useDiscoveryStore((s) => s.discoverabilityEnabled);
  const is18Plus = useDiscoveryStore((s) => s.is18Plus);
  const { locale } = useLocale();

  const handleTranscript = useCallback(async (transcript: string): Promise<boolean> => {
    if (!classifyNearbyIntent(transcript)) return false;

    if (!idToken || !discoverabilityEnabled || is18Plus !== true) {
      sonicEngine.riff.speak(
        'Turn on discovery in settings to find nearby singers.',
        locale,
      );
      return true;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        sonicEngine.riff.speak(
          'I need your approximate location to find nearby singers.',
          locale,
        );
        return true;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
      });
      const plusCode = toCoarsePlusCode(loc.coords.latitude, loc.coords.longitude);
      const users = await getNearbyUsers(idToken, plusCode);
      sonicEngine.riff.speak(buildNearbyResponse(users), locale);
    } catch {
      sonicEngine.riff.speak(
        "I couldn't check for nearby singers right now — try again in a moment.",
        locale,
      );
    }

    return true;
  }, [idToken, discoverabilityEnabled, is18Plus, locale]);

  return { handleTranscript };
}
