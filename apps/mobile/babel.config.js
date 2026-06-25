// Expo SDK 56 Babel config (Story 1.1).
module.exports = function babel(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
