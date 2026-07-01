// DrivingModeScreen — true-black OLED screen shown while the device is in motion (Story 4.7,
// FR17, UX-DR5). The screen is intentionally featureless: no buttons, no text, no distractions.
// A single tap anywhere wakes Riff via voice — never via UI — so the driver's eyes stay forward.
// Ambient presence (partner breath sounds) continues through SonicEngine behind the screen.

import { StyleSheet, Pressable, View } from 'react-native';
import { useCallback } from 'react';
import { sonicEngine } from '../../sonic';
import { useLocale } from '../../i18n/useLocale';

interface DrivingModeScreenProps {
  /**
   * Called when the user taps the screen to wake Riff.
   * The parent should activate STT / open the listening window.
   */
  onWake: () => void;
}

export function DrivingModeScreen({ onWake }: DrivingModeScreenProps) {
  const { locale } = useLocale();

  const handleTap = useCallback(() => {
    // Riff acknowledges by voice — no visual change (UX-DR9 eyes-free immediacy).
    sonicEngine.riff.speak('Listening...', locale);
    onWake();
  }, [onWake, locale]);

  return (
    <Pressable
      style={styles.screen}
      onPress={handleTap}
      accessibilityRole="button"
      accessibilityLabel="Tap to speak with Riff"
      accessibilityHint="Voice assistant will start listening"
    >
      {/* Invisible touch target — the whole screen is the button. */}
      <View style={styles.screen} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
