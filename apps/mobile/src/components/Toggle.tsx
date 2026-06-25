import { Pressable, View } from 'react-native';
import { toggleTrackClass } from '../theme/variants';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required accessibility label (UX-DR14). */
  accessibilityLabel: string;
  disabled?: boolean;
}

/**
 * Switch primitive (UX-DR7) with a proper `switch` role + checked state. The hit target is
 * padded to ≥48px (UX-DR14) even though the visible track is smaller. The knob uses logical
 * start/end insets so it mirrors correctly in RTL.
 */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={12}
      className={`min-h-[48px] min-w-[48px] items-center justify-center ${disabled ? 'opacity-40' : ''}`}
    >
      <View className={toggleTrackClass(value)}>
        <View
          className="h-[26px] w-[26px] rounded-full bg-text-primary"
          style={{ marginStart: value ? 23 : 3 }}
        />
      </View>
    </Pressable>
  );
}
