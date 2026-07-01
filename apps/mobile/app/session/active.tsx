import { View, StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useMotionDetection } from '../../src/motion/useMotionDetection';
import { DrivingModeScreen } from '../../src/components/session/DrivingModeScreen';
import { WaveformVisualizer } from '../../src/components/session/WaveformVisualizer';
import { SessionControls } from '../../src/components/session/SessionControls';
import { ScreenContainer, Text, Card } from '../../src/components';
import { colors } from '../../src/theme/tokens';
import { sonicEngine } from '../../src/sonic';
import { useLocale } from '../../src/i18n/useLocale';

/**
 * Active duet screen (Story 4.7, FR17, UX-DR5/UX-DR6/UX-DR12).
 *
 * Two modes, switched by the accelerometer:
 *  - DRIVING   → true-black screen; ambient presence audio; tap wakes Riff by voice.
 *  - STATIONARY → WaveformVisualizer + SessionControls are revealed for visual interaction.
 *
 * Motion entry/exit is debounced (3 s / 5 s) to absorb red-light stops without flickering.
 */
export default function ActiveSession() {
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { locale } = useLocale();
  const { isDriving } = useMotionDetection();

  const handleWake = useCallback(() => {
    // Parent no-op: DrivingModeScreen already spoke "Listening..." via RiffVoice.
    // The STT pipeline in useRiffAgent / usePlaybackControls is always active during a session;
    // this callback exists so the screen can wire additional side-effects in future stories.
  }, []);

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
