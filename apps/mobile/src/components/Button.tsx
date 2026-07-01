import { Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';
import { Text } from './Text';
import { buttonClasses, buttonLabelColor, type ButtonVariant } from '../theme/variants';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'accessibilityLabel'> {
  /** Visible label for primary/secondary variants. */
  label?: string;
  variant?: ButtonVariant;
  /** Required for accessibility (UX-DR14) — especially for icon/voice variants. */
  accessibilityLabel: string;
  disabled?: boolean;
  /** Icon/content for icon & voice variants. */
  children?: ReactNode;
}

/**
 * Button primitive with 4 variants (primary, secondary, voice, icon) — UX-DR7.
 * Every button is a real accessibility button (role + label) with a ≥48px target (UX-DR14).
 */
export function Button({
  label,
  variant = 'primary',
  accessibilityLabel,
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      className={`${buttonClasses(variant, disabled)} ${className ?? ''}`}
      {...rest}
    >
      {label ? (
        <Text variant="h3" color={buttonLabelColor(variant)}>
          {label}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
