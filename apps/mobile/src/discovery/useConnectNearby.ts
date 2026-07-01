// Nearby-connect voice hook (Story 5.5, FR30/FR31).
// Intercepts "connect with [name]" transcripts, resolves the name to a nearby userId,
// calls the connect API (save partner + go-dark), and speaks a confirmation via Riff.

import { useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocale } from '../i18n/useLocale';
import { sonicEngine } from '../sonic';
import { connectNearby, type NearbyUser } from '../api/discovery';
import { classifyConnectIntent, findByName } from './connectIntent';

export interface ConnectNearbyActions {
  /**
   * Classify the transcript as a "connect with [name]" command and, if matched,
   * look up the target in `nearbyUsers`, call the connect API, and speak a confirmation.
   * Returns `true` when the transcript was consumed; `false` when it's unrelated.
   */
  handleTranscript: (transcript: string) => Promise<boolean>;
}

export function useConnectNearby(nearbyUsers: NearbyUser[]): ConnectNearbyActions {
  const idToken = useAuthStore((s) => s.idToken);
  const { locale } = useLocale();

  const handleTranscript = useCallback(async (transcript: string): Promise<boolean> => {
    const result = classifyConnectIntent(transcript);
    if (!result.matched) return false;
    if (!idToken) return true;

    const target = findByName(nearbyUsers, result.targetName);
    if (!target) {
      sonicEngine.riff.speak(
        `I don't see anyone named ${result.targetName} nearby. Try asking who's nearby first.`,
        locale,
      );
      return true;
    }

    try {
      await connectNearby(idToken, target.userId);
      sonicEngine.riff.speak(
        `Done — ${target.displayName} is now in your saved partners. Their location has been removed.`,
        locale,
      );
    } catch {
      sonicEngine.riff.speak(
        `Couldn't connect with ${target.displayName} right now — try again in a moment.`,
        locale,
      );
    }

    return true;
  }, [idToken, nearbyUsers, locale]);

  return { handleTranscript };
}
