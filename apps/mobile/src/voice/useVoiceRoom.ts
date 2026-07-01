import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useMicConsent } from './consentStore';
import { getVoiceToken } from '../api/voice';
import { connectVoiceRoom, type VoiceConnection } from './voiceRoom';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Opens (and tears down) the session's voice plane once the user has consented to the mic
 * (FR22). Fetches a participant-gated token, connects to the SFU, publishes the mic, and
 * tracks whether the partner is present (FR23/FR24).
 */
export function useVoiceRoom(sessionId: string | undefined) {
  const idToken = useAuthStore((s) => s.idToken);
  const micConsented = useMicConsent((s) => s.micConsented);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [partnerPresent, setPartnerPresent] = useState(false);
  const connRef = useRef<VoiceConnection | null>(null);

  useEffect(() => {
    if (!sessionId || !idToken || !micConsented) return;
    let cancelled = false;
    setStatus('connecting');

    void (async () => {
      try {
        const grant = await getVoiceToken(idToken, sessionId);
        if (cancelled) return;
        const conn = await connectVoiceRoom(grant, {
          onRemotePresence: setPartnerPresent,
          onReconnecting: () => setStatus('reconnecting'),
          onReconnected: () => setStatus('connected'),
          onDisconnected: () => setStatus('idle'),
        });
        if (cancelled) {
          await conn.disconnect();
          return;
        }
        connRef.current = conn;
        setStatus('connected');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      void connRef.current?.disconnect();
      connRef.current = null;
    };
  }, [sessionId, idToken, micConsented]);

  /** Unsubscribe from all remote audio tracks — silences the partner immediately (Story 6.1). */
  const mutePartner = useCallback(() => {
    const room = connRef.current?.room;
    if (!room) return;
    for (const [, participant] of room.remoteParticipants) {
      for (const [, pub] of participant.audioTrackPublications) {
        pub.setSubscribed(false);
      }
    }
  }, []);

  return { status, partnerPresent, mutePartner };
}
