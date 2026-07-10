import type { ExpoConfig } from 'expo/config';

/**
 * Expo app config (Story 1.1). Uses CNG (`expo prebuild`) — no hand-edited
 * native projects. Native audio (local Expo Module) and WebRTC config plugins
 * are added in later epics (Story 4.1).
 */
const config: ExpoConfig = {
  name: 'Caraoke',
  slug: 'caraoke',
  owner: 'infonuagix-ai',
  scheme: 'caraoke',
  version: '0.1.0',
  // EAS Update (OTA JS updates). runtimeVersion ties an update to a compatible native build.
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/a8f9cffe-be6b-44ce-bff3-73fef2b2258e',
  },
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'ai.caraoke.app',
    infoPlist: {
      // Mic consent copy (FR22). Caraoke captures the mic only for the live duet voice.
      NSMicrophoneUsageDescription:
        'Caraoke uses your microphone so you and your partner can hear each other while you sing. Your voice is live only and never recorded.',
      // Location consent copy (Story 5.3, FR29). Only a coarse area is used — never stored.
      NSLocationWhenInUseUsageDescription:
        'Caraoke uses your approximate location to show you nearby singers. Only a coarse area code is shared — your exact location is never stored or transmitted.',
    },
  },
  android: {
    package: 'ai.caraoke.app',
    permissions: ['RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'ACCESS_COARSE_LOCATION'],
    // Android App Links for the OAuth return (Google via Cognito, Spotify). The custom scheme
    // caraoke:// is the primary return today; these verified HTTPS deep-links (backed by
    // /.well-known/assetlinks.json) are kept so we can harden to domain-bound links later
    // without an app change.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          { scheme: 'https', host: 'api.caraoke.ai', pathPrefix: '/auth/callback' },
          { scheme: 'https', host: 'api.caraoke.ai', pathPrefix: '/spotify/callback' },
          { scheme: 'https', host: 'api.caraoke.ai', pathPrefix: '/join' },
        ],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-notifications',
    '@livekit/react-native-expo-plugin',
    '@config-plugins/react-native-webrtc',
    [
      '@stripe/stripe-react-native',
      { merchantIdentifier: 'merchant.ai.caraoke.app', enableGooglePay: false },
    ],
    // On-device Spotify App Remote: controls the phone's own Spotify app directly (no Web-API
    // active-device requirement). Redirect URI = caraoke://spotify-auth — register it, the iOS
    // bundle id, and the Android package + signing SHA-1 in the Spotify dashboard.
    // On-device Spotify App Remote — via a local wrapper (./plugins/withSpotifySdk) because the
    // package hides its plugin behind a broken "exports"/ESM setup that pnpm can't resolve. The
    // client ID is a public OAuth id (ships in every build, not a secret); hardcoded fallback so
    // config resolves even where the local .env isn't loaded (EAS build's config step).
    [
      './plugins/withSpotifySdk',
      {
        clientID: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || 'e867c98588144777a723752540a67bba',
        scheme: 'caraoke',
        host: 'spotify-auth',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  // Links this project to its EAS build project (used by `eas build`).
  extra: {
    eas: {
      projectId: 'a8f9cffe-be6b-44ce-bff3-73fef2b2258e',
    },
  },
};

export default config;
