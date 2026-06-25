import caraoke from '@caraoke/config/eslint';

export default [
  ...caraoke,
  {
    // RN tooling configs are CommonJS by necessity — allow require() there.
    files: ['babel.config.js', 'metro.config.js', 'tailwind.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
];
