import '../global.css';
import '../src/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useDiscoveryStore } from '../src/stores/useDiscoveryStore';
import { useLocationPublisher } from '../src/discovery/useLocationPublisher';
import { usePushRegistration } from '../src/notifications/usePushRegistration';
import { clockSync } from '../src/lib/clockSync';
import { attachSonicEngine } from '../src/sonic';

const queryClient = new QueryClient();

/** Child of the providers so it can use router + query hooks. */
function PushBridge() {
  usePushRegistration();
  return null;
}

/** Keep the server-time offset fresh while the app is running (Story 3.6). */
function ClockBridge() {
  useEffect(() => {
    clockSync.start();
    return () => clockSync.stop();
  }, []);
  return null;
}

/** Subscribe the sonic layer to the SessionStateMachine (Story 4.2, UX-DR2). */
function SonicBridge() {
  useEffect(() => attachSonicEngine(), []);
  return null;
}

/** Publish coarse Plus Code while discovery is active (Story 5.3, FR29, NFR9). */
function LocationBridge() {
  useLocationPublisher();
  return null;
}

/**
 * Root layout (Expo Router). Provides TanStack Query, restores any persisted session on
 * launch, and hosts the navigation stack. Feature route groups — (onboarding)/ (auth)/
 * session/ discovery/ profile/ billing/ — are added in their respective epics.
 */
export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateDiscovery = useDiscoveryStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateDiscovery();
  }, [hydrate, hydrateDiscovery]);

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <PushBridge />
          <ClockBridge />
          <SonicBridge />
          <LocationBridge />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
}
