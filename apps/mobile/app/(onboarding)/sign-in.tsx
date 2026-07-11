import { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Icon } from '../../src/components';
import { useCognitoSignIn } from '../../src/auth/useCognitoSignIn';
import { useAuthStore } from '../../src/stores/useAuthStore';
import type { FederatedProvider } from '../../src/auth/config';

/**
 * Onboarding sign-in (Story 2.2). One tap to create a Caraoke account with Apple or Google
 * (Cognito hosted-UI OAuth). Returning users are reused server-side via the stable subject.
 */
export default function SignIn() {
  const { signIn, ready } = useCognitoSignIn();
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const [busy, setBusy] = useState<FederatedProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPress = async (provider: FederatedProvider) => {
    setBusy(provider);
    setError(null);
    try {
      // Two return paths complete the exchange: on iOS the auth session returns inline (signIn
      // sets the session directly); on Android the caraoke:// redirect deep-links to
      // app/auth/callback. Either way the session flips to signedIn — the redirect below then
      // leaves this screen. Only a thrown error is a real failure.
      await signIn(provider);
    } catch {
      setError(t('onboarding.error'));
    } finally {
      setBusy(null);
    }
  };

  // Once signed in (by either return path), leave the sign-in screen. Without this, the iOS
  // inline path sets the session but never navigates, stranding the user on this screen.
  if (authStatus === 'signedIn') return <Redirect href="/" />;

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-2xl">
        <View className="items-center gap-sm">
          <Text variant="display">{t('app.name')}</Text>
          <Text variant="body" color="secondary">
            {t('app.tagline')}
          </Text>
        </View>

        <View className="gap-md">
          <Button
            label={busy === 'apple' ? t('onboarding.signingIn') : t('onboarding.continueApple')}
            accessibilityLabel={t('onboarding.continueApple')}
            disabled={!ready || busy != null}
            onPress={() => onPress('apple')}
          />
          <Button
            label={busy === 'google' ? t('onboarding.signingIn') : t('onboarding.continueGoogle')}
            variant="secondary"
            accessibilityLabel={t('onboarding.continueGoogle')}
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
