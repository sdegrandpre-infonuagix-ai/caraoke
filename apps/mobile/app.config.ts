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
    infoPlist: {
      // Mic consent copy (FR22). Caraoke captures the mic only for the live duet voice.
      NSMicrophoneUsageDescription:
        'Caraoke uses your microphone so you and your partner can hear each other while you sing. Your voice is live only and never recorded.',
    },
  },
  android: {
    package: 'ai.caraoke.app',
    permissions: ['RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS'],
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    '@livekit/react-native-expo-plugin',
    '@config-plugins/react-native-webrtc',
    [
      '@stripe/stripe-react-native',
      { merchantIdentifier: 'merchant.ai.caraoke.app', enableGooglePay: false },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
