// Expo SDK 56 + NativeWind v4 Babel config (Story 2.1).
// `react-native-reanimated/plugin` MUST be last.
module.exports = function babel(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
