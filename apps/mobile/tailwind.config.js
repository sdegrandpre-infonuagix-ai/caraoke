/**
 * Caraoke "Warm Dusk" design tokens (Story 2.1, UX-DR1).
 * Single source of truth for color, spacing (8px scale), type scale, and radius.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: '#1A1A2E',
        surface: '#16213E',
        'surface-raised': '#1F2B47',
        accent: '#FF6B6B',
        'accent-muted': '#FF6B6B40',
        secondary: '#FFD93D',
        'text-primary': '#F0E6D3',
        'text-secondary': '#9B8E82',
        'text-disabled': '#5A5067',
        border: '#2D2844',
        error: '#FF4D4D',
        success: '#4ADE80',
        black: '#000000',
      },
      // 8px base spacing scale (UX-DR1).
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '12px',
        md: '16px',
        lg: '28px',
        full: '9999px',
      },
      // Type scale — [size, { lineHeight, fontWeight }]. 1.2x headers, 1.4x body.
      fontSize: {
        display: ['32px', { lineHeight: '38px', fontWeight: '700' }],
        h1: ['26px', { lineHeight: '31px', fontWeight: '700' }],
        h2: ['22px', { lineHeight: '26px', fontWeight: '600' }],
        h3: ['18px', { lineHeight: '22px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '22px', fontWeight: '400' }],
        caption: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        small: ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
