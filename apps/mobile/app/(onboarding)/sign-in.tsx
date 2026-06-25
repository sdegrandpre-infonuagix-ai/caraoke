import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Icon } from '../../src/components';
import { useCognitoSignIn } from '../../src/auth/useCognitoSignIn';
import type { FederatedProvider } from '../../src/auth/config';

/**
 * Onboarding sign-in (Story 2.2). One tap to create a Caraoke account with Apple or Google
 * (Cognito hosted-UI OAuth). Returning users are reused server-side via the stable subject.
 */
export default function SignIn() {
  const { signIn, ready } = useCognitoSignIn();
  const { t } = useTranslation();
  const [busy, setBusy] = useState<FederatedProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPress = async (provider: FederatedProvider) => {
    setBusy(provider);
    setError(null);
    try {
      const okSignIn = await signIn(provider);
      if (!okSignIn) setError(t('onboarding.error'));
    } catch {
      setError(t('onboarding.error'));
    } finally {
      setBusy(null);
    }
  };

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
