// Drives the "Start singing" handshake store from the AppSync session channel. Mounted on the
// active screen for BOTH participants: when the host picks a song, `song.proposed` shows it on
// both phones; when both have confirmed and the server schedules the start, `playback.scheduled`
// (and `session.ended`) clears the gate so useScheduledStart's countdown takes over.

import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useStartHandshake, type ProposedTrack } from '../stores/useStartHandshake';
import { subscribeSessionEvents } from './appSyncEvents';

export function useStartHandshakeEvents(sessionId: string): void {
  const idToken = useAuthStore((s) => s.idToken);

  useEffect(() => {
    if (!sessionId || !idToken) return;
    const { propose, clear } = useStartHandshake.getState();

    const unsub = subscribeSessionEvents(sessionId, (event) => {
      if (event.type === 'song.proposed') {
        const d = event.data as Partial<ProposedTrack> & {
          trackUri?: string;
          trackName?: string;
          artist?: string;
          trackId?: string;
        };
        if (d.trackUri && d.trackName) {
          propose({
            trackUri: d.trackUri,
            trackName: d.trackName,
            artist: d.artist ?? '',
            trackId: d.trackId,
          });
        }
      } else if (event.type === 'playback.scheduled' || event.type === 'session.ended') {
        clear();
      }
    });

    return () => {
      unsub();
      // Leaving the session: drop any stale proposal so a later session starts clean.
      useStartHandshake.getState().clear();
    };
  }, [sessionId, idToken]);
}
