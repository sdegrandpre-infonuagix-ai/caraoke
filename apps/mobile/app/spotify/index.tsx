import { Linking, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card, Icon } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useSpotifyAuth } from '../../src/auth/useSpotifyAuth';
import { useSpotifyStatus, type SpotifyStatus } from '../../src/api/spotify';

const PREMIUM_URL = 'https://www.spotify.com/premium/';

/**
 * Connect & verify Spotify Premium (Story 2.4, FR2). The mobile runs Spotify OAuth; the API
 * verifies Premium via the integration abstraction. Premium → confirmed; non-Premium is told
 * plainly and offered an upgrade path (never silently accepted).
 */
export default function SpotifyLinkScreen() {
  const idToken = useAuthStore((s) => s.idToken);
  const authStatus = useAuthStore((s) => s.status);
  const { authorize, ready } = useSpotifyAuth();
  const statusQuery = useSpotifyStatus();
  const { t } = useTranslation();

  // Tapping connect just opens Spotify's consent page. The OAuth return is an App Link that
  // Expo Router hands to app/spotify/callback, which exchanges the code, links the account, and
  // navigates back here — where useSpotifyStatus refetches and shows the connected state.
  const link = useMutation({
    mutationFn: () => authorize(),
  });

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const status: SpotifyStatus | undefined = statusQuery.data;

  return (
    <ScreenContainer>
      <View className="flex-1 gap-xl">
        <Text variant="h1">{t('spotify.title')}</Text>
        <Text color="secondary">{t('spotify.intro')}</Text>

        {status?.linked && status.isPremium ? (
          <Card>
            <View className="flex-row items-center gap-sm">
              <Icon name="checkmark-circle" color="#4ADE80" accessibilityLabel={t('spotify.connected')} />
              <Text variant="h3" color="success">
                {t('spotify.connected')}
              </Text>
            </View>
          </Card>
        ) : null}

        {status?.linked && !status.isPremium ? (
          <Card>
            <View className="gap-sm">
              <View className="flex-row items-center gap-sm">
                <Icon name="alert-circle" color="#FF4D4D" accessibilityLabel={t('spotify.notPremiumTitle')} />
                <Text variant="h3" color="error">
                  {t('spotify.notPremiumTitle')}
                </Text>
              </View>
              <Text color="secondary">
                {t('spotify.notPremiumBody', { product: status.product })}
              </Text>
              <Button
                label={t('spotify.upgrade')}
                accessibilityLabel={t('spotify.upgrade')}
                onPress={() => void Linking.openURL(PREMIUM_URL)}
              />
            </View>
          </Card>
        ) : null}

        <Button
          label={
            link.isPending
              ? t('spotify.connecting')
              : status?.linked
                ? t('spotify.reconnect')
                : t('spotify.connect')
          }
          variant={status?.linked ? 'secondary' : 'primary'}
          accessibilityLabel={t('spotify.connect')}
          disabled={!ready || link.isPending || !idToken}
          onPress={() => link.mutate()}
        />
        {link.isError ? (
          <Text variant="caption" color="error">
            {t('spotify.error')}
          </Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
