// Programmatic mirror of the "Warm Dusk" tokens (Story 2.1, UX-DR1) for code paths that
// need raw values (icon/avatar sizing, native props) rather than NativeWind classNames.
// Keep in sync with tailwind.config.js.

export const colors = {
  base: '#1A1A2E',
  surface: '#16213E',
  surfaceRaised: '#1F2B47',
  accent: '#FF6B6B',
  accentMuted: '#FF6B6B40',
  secondary: '#FFD93D',
  textPrimary: '#F0E6D3',
  textSecondary: '#9B8E82',
  textDisabled: '#5A5067',
  border: '#2D2844',
  error: '#FF4D4D',
  success: '#4ADE80',
  black: '#000000',
} as const;

/** 8px base spacing scale. */
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 } as const;

export const radius = { sm: 12, md: 16, lg: 28, full: 9999 } as const;

/** Minimum touch targets (UX-DR14 / layout principle 4). */
export const touchTarget = { min: 48, cta: 56, voice: 72 } as const;

/** Partner accent mapping: initiator = coral, joiner = gold. */
export const partnerColor = { A: colors.accent, B: colors.secondary } as const;

export type ColorToken = keyof typeof colors;
