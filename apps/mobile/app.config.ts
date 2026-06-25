import type { ExpoConfig } from 'expo/config';

/**
 * Expo app config (Story 1.1). Uses CNG (`expo prebuild`) — no hand-edited
 * native projects. Native audio (local Expo Module) and WebRTC config plugins
 * are added in later epics (Story 4.1).
 */
const config: ExpoConfig = {
  name: 'Caraoke',
  slug: 'caraoke',
  scheme: 'caraoke',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'ai.caraoke.app',
  },
  android: {
    package: 'ai.caraoke.app',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
