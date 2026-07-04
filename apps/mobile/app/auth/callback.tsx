import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { ScreenContainer, Text } from '../../src/components';
import { completeCognitoSignIn } from '../../src/auth/completeSignIn';
import { useAuthStore } from '../../src/stores/useAuthStore';

/**
 * OAuth return target for Cognito sign-in (https://api.caraoke.ai/auth/callback, via Android
 * App Links). Finishes the token exchange from the `code`, then routes into the app. Runs the
 * exchange here because the auth session's redirect lands on this screen, not the sign-in hook.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; state?: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        // No auth tab open (e.g. the session already returned) — ignore.
      }
      const code = typeof params.code === 'string' ? params.code : undefined;
      const state = typeof params.state === 'string' ? params.state : undefined;

      let signedIn = useAuthStore.getState().status === 'signedIn';
      if (!signedIn && code) {
        signedIn = await completeCognitoSignIn(code, state).catch(() => false);
      }
      if (!cancelled) router.replace(signedIn ? '/' : '/(onboarding)/sign-in');
    })();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.state, router]);

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <Text color="secondary">{t('onboarding.signingIn')}</Text>
      </View>
    </ScreenContainer>
  );
}
