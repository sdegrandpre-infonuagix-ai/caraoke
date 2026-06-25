import '../global.css';
import '../src/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/stores/useAuthStore';
import { usePushRegistration } from '../src/notifications/usePushRegistration';

const queryClient = new QueryClient();

/** Child of the providers so it can use router + query hooks. */
function PushBridge() {
  usePushRegistration();
  return null;
}

/**
 * Root layout (Expo Router). Provides TanStack Query, restores any persisted session on
 * launch, and hosts the navigation stack. Feature route groups — (onboarding)/ (auth)/
 * session/ discovery/ profile/ billing/ — are added in their respective epics.
 */
export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <PushBridge />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
