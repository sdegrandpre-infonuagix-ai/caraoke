// ⚠️ THROWAWAY — Phase 0 harness (Story 1.3).
module.exports = function babel(api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
