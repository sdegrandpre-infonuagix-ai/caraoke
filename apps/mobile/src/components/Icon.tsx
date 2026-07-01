import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: IconName;
  size?: number;
  /** Hex color; defaults to primary text. */
  color?: string;
  /**
   * Accessibility label. When omitted the icon is treated as decorative and hidden from
   * screen readers (its meaning is conveyed by an adjacent label).
   */
  accessibilityLabel?: string;
}

/** Icon primitive (UX-DR7) wrapping Ionicons with sane a11y defaults. */
export function Icon({ name, size = 24, color = colors.textPrimary, accessibilityLabel }: IconProps) {
  const decorative = accessibilityLabel === undefined;
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
