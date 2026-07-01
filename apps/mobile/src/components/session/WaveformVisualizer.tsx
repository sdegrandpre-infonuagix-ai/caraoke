// WaveformVisualizer — animated audio waveform shown when stationary (Story 4.7, UX-DR6/UX-DR12).
// Animations run on the UI thread via Reanimated worklets — no JS-thread jank during Spotify
// audio processing or network activity.

import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '../../theme/tokens';

const BAR_COUNT = 7;
const BAR_MIN_HEIGHT = 6;
const BAR_MAX_HEIGHT = 44;
const BASE_DURATION_MS = 380;

interface WaveBarProps {
  index: number;
  /** 0–1 normalised amplitude for this bar's peak height. */
  amplitude: number;
}

function WaveBar({ index, amplitude }: WaveBarProps) {
  const height = useSharedValue(BAR_MIN_HEIGHT);

  useEffect(() => {
    // Stagger each bar's phase so the waveform flows left-to-right (UI-thread, UX-DR6).
    const duration = BASE_DURATION_MS + index * 55;
    const peak = BAR_MIN_HEIGHT + (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) * Math.max(0.2, amplitude);

    height.value = withRepeat(
      withSequence(
        withTiming(peak, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(BAR_MIN_HEIGHT, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, // infinite
      false,
    );

    return () => cancelAnimation(height);
  }, [amplitude, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

export interface WaveformVisualizerProps {
  /**
   * 0–1 normalised amplitude. Pass the current voice/music energy level.
   * Defaults to 0.7 (passive idle animation).
   */
  amplitude?: number;
}

export function WaveformVisualizer({ amplitude = 0.7 }: WaveformVisualizerProps) {
  return (
    <View style={styles.container} accessibilityLabel="Audio waveform" accessibilityRole="image">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <WaveBar key={i} index={i} amplitude={amplitude} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  bar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginHorizontal: 4,
  },
});
