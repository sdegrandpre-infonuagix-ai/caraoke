import { useState } from 'react';
import { View } from 'react-native';
import { ScreenContainer, Text, Button, Icon } from '../../src/components';
import { useCognitoSignIn } from '../../src/auth/useCognitoSignIn';
import type { FederatedProvider } from '../../src/auth/config';

/**
 * Onboarding sign-in (Story 2.2). One tap to create a Caraoke account with Apple or Google
 * (Cognito hosted-UI OAuth). Returning users are reused server-side via the stable subject.
 */
export default function SignIn() {
  const { signIn, ready } = useCognitoSignIn();
  const [busy, setBusy] = useState<FederatedProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPress = async (provider: FederatedProvider) => {
    setBusy(provider);
    setError(null);
    try {
      const okSignIn = await signIn(provider);
      if (!okSignIn) setError('Sign-in was cancelled or failed. Please try again.');
    } catch {
      setError('Something went wrong signing in. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-2xl">
        <View className="items-center gap-sm">
          <Text variant="display">Caraoke</Text>
          <Text variant="body" color="secondary">
            Sing together, across distance.
          </Text>
        </View>

        <View className="gap-md">
          <Button
            label={busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
            accessibilityLabel="Sign in with Apple"
            disabled={!ready || busy != null}
            onPress={() => onPress('apple')}
          />
          <Button
            label={busy === 'google' ? 'Signing in…' : 'Continue with Google'}
            variant="secondary"
            accessibilityLabel="Sign in with Google"
            disabled={!ready || busy != null}
            onPress={() => onPress('google')}
          />

          {error ? (
            <View className="flex-row items-center gap-sm">
              <Icon name="alert-circle" accessibilityLabel="Error" />
              <Text variant="caption" color="error">
                {error}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}
