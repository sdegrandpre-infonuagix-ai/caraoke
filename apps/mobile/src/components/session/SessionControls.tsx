// SessionControls — visible when the device is stationary (Story 4.7, UX-DR12).
// Provides minimal touch controls for pause/resume/stop that complement the always-available
// voice interface. The driver primarily uses voice; these controls are the stationary fallback.

import { View, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { useSessionMachine } from '../../stores/useSessionMachine';
import { pauseOnDevice, resumeOnDevice } from '../../spotify/appRemote';
import { sonicEngine } from '../../sonic';
import { useLocale } from '../../i18n/useLocale';
import { colors } from '../../theme/tokens';

interface SessionControlsProps {
  sessionId: string;
}

export function SessionControls(_props: SessionControlsProps) {
  const transition = useSessionMachine((s) => s.transition);
  const { current: locale } = useLocale();
  const [isPaused, setIsPaused] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Pause/resume act on THIS phone's own Spotify via the App Remote (each car controls its own).
  const handlePauseResume = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (isPaused) {
        await resumeOnDevice();
        sonicEngine.riff.speak('Resuming.', locale);
        setIsPaused(false);
      } else {
        await pauseOnDevice();
        sonicEngine.riff.speak('Paused.', locale);
        setIsPaused(true);
      }
    } finally {
      setIsBusy(false);
    }
  }, [isPaused, isBusy, locale]);

  const handleStop = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await pauseOnDevice();
      transition('ended');
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, transition]);

  return (
    <View style={styles.container}>
      <Button
        variant="secondary"
        accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
        onPress={handlePauseResume}
        disabled={isBusy}
      >
        <Icon
          name={isPaused ? 'play' : 'pause'}
          size={28}
          color={colors.textPrimary}
          accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
        />
      </Button>

      <Button
        variant="secondary"
        accessibilityLabel="End session"
        onPress={handleStop}
        disabled={isBusy}
      >
        <Icon name="stop" size={28} color={colors.error} accessibilityLabel="End session" />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
});
