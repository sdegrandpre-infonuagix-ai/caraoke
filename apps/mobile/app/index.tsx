import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { ScreenContainer, Text, Avatar, Button } from '../src/components';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useMe } from '../src/api/useMe';

/**
 * Home route. Redirects to onboarding when signed out; otherwise greets the current user.
 * The full home experience is built in later epics — this proves the auth gate end-to-end.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);
  const me = useMe();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text color="secondary">Loading…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href="/(onboarding)/sign-in" />;
  }

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center gap-lg">
        <Avatar name={me.data?.displayName ?? me.data?.email ?? 'You'} size="lg" partner="A" />
        <Text variant="h2">{me.data?.displayName ?? me.data?.email ?? 'Welcome'}</Text>
        <Text color="secondary">You're signed in.</Text>
        <Button
          label="Edit profile"
          accessibilityLabel="Edit profile"
          onPress={() => router.push('/profile')}
        />
        <Button
          label="Sign out"
          variant="secondary"
          accessibilityLabel="Sign out"
          onPress={() => void signOut()}
        />
      </View>
    </ScreenContainer>
  );
}
