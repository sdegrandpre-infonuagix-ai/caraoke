import { View, StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useMotionDetection } from '../../src/motion/useMotionDetection';
import { useVoiceRoom } from '../../src/voice/useVoiceRoom';
import { useReconnect } from '../../src/reconnect/useReconnect';
import { useFeltTogether } from '../../src/telemetry/useFeltTogether';
import { DrivingModeScreen } from '../../src/components/session/DrivingModeScreen';
import { WaveformVisualizer } from '../../src/components/session/WaveformVisualizer';
import { SessionControls } from '../../src/components/session/SessionControls';
import { ScreenContainer, Text, Card } from '../../src/components';
import { useLocale } from '../../src/i18n/useLocale';

/**
 * Active duet screen (Story 4.7/4.8/4.9, FR17/FR15/FR16/FR25/FR26/FR42,
 * UX-DR5/UX-DR6/UX-DR11/UX-DR12/UX-DR16).
 *
 * Two modes, switched by the accelerometer:
 *  - DRIVING   → true-black screen; ambient presence audio; tap wakes Riff by voice.
 *  - STATIONARY → WaveformVisualizer + SessionControls are revealed for visual interaction.
 *
 * Motion entry/exit is debounced (3 s / 5 s) to absorb red-light stops without flickering.
 * Connection drops are handled silently by useReconnect — Riff speaks, no modal required.
 * Post-session: Riff asks "Did that feel like singing together?" after a 2-second afterglow;
 * the spoken answer is captured and stored for telemetry — no visual component (UX-DR16).
 */
export default function ActiveSession() {
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isDriving } = useMotionDetection();

  // Voice room: maintains the LiveKit full-duplex session and exposes connection status
  // including 'reconnecting' (Story 4.8) when LiveKit is auto-recovering (FR15).
  const { status: voiceStatus } = useVoiceRoom(id);

  // Reconnect handler: watches voiceStatus for drops, speaks Riff, resumes on recovery.
  // No-op if id is undefined (guard below redirects before hooks fire).
  useReconnect(id ?? '', voiceStatus);

  // Post-session felt-together capture (Story 4.9, FR42/UX-DR16). No visual component.
  // captureAnswer is wired here for the STT pipeline to call when a transcript arrives
  // after the session ends. awaitingAnswer is intentionally unused in the UI (UX-DR16).
  const { captureAnswer } = useFeltTogether(id ?? '');

  const handleWake = useCallback((transcript?: string) => {
    // DrivingModeScreen already spoke "Listening…" via RiffVoice on tap.
    // After the session ends, taps may carry the user's spoken answer to the felt-together
    // question; route those transcripts into the capture window (Story 4.9, UX-DR16).
    if (transcript) captureAnswer(transcript);
  }, [captureAnswer]);

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;
  if (!id) return <Redirect href="/" />;

  if (isDriving) {
    return <DrivingModeScreen onWake={handleWake} />;
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text variant="h1">{t('session.singing')}</Text>

        <Card raised style={styles.waveCard}>
          <WaveformVisualizer />
        </Card>

        <SessionControls sessionId={id} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  waveCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
