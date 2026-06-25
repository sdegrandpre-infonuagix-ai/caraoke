import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'small';
export type TextColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'accent'
  | 'error'
  | 'success';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
}

const VARIANT_CLASS: Record<TextVariant, string> = {
  display: 'text-display',
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  body: 'text-body',
  caption: 'text-caption',
  small: 'text-small',
};

const COLOR_CLASS: Record<TextColor, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  disabled: 'text-text-disabled',
  accent: 'text-accent',
  error: 'text-error',
  success: 'text-success',
};

/**
 * Type-scale text primitive (UX-DR7). Defaults to body/primary. Respects OS font scaling
 * (dynamic type) by leaving `allowFontScaling` at its RN default of true.
 */
export function Text({ variant = 'body', color = 'primary', className, ...rest }: TextProps) {
  return (
    <RNText className={`${VARIANT_CLASS[variant]} ${COLOR_CLASS[color]} ${className ?? ''}`} {...rest} />
  );
}
