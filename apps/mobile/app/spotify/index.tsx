import { Linking, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ScreenContainer, Text, Button, Card, Icon } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useSpotifyAuth } from '../../src/auth/useSpotifyAuth';
import { linkSpotify, useSpotifyStatus, type SpotifyStatus } from '../../src/api/spotify';

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
  const queryClient = useQueryClient();
  const statusQuery = useSpotifyStatus();

  const link = useMutation({
    mutationFn: async () => {
      const tokens = await authorize();
      if (!tokens) throw new Error('cancelled');
      return linkSpotify(idToken!, tokens);
    },
    onSuccess: (status) => queryClient.setQueryData(['spotify'], status),
  });

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const status: SpotifyStatus | undefined = link.data ?? statusQuery.data;

  return (
    <ScreenContainer>
      <View className="flex-1 gap-xl">
        <Text variant="h1">Connect Spotify</Text>
        <Text color="secondary">
          Caraoke plays the song from your own Spotify. A Premium account is required to sing
          together.
        </Text>

        {status?.linked && status.isPremium ? (
          <Card>
            <View className="flex-row items-center gap-sm">
              <Icon name="checkmark-circle" color="#4ADE80" accessibilityLabel="Verified" />
              <Text variant="h3" color="success">
                Spotify Premium connected
              </Text>
            </View>
          </Card>
        ) : null}

        {status?.linked && !status.isPremium ? (
          <Card>
            <View className="gap-sm">
              <View className="flex-row items-center gap-sm">
                <Icon name="alert-circle" color="#FF4D4D" accessibilityLabel="Not Premium" />
                <Text variant="h3" color="error">
                  Spotify connected, but not Premium
                </Text>
              </View>
              <Text color="secondary">
                Your Spotify account is “{status.product}”. Caraoke duets need Spotify Premium.
              </Text>
              <Button
                label="Upgrade to Premium"
                accessibilityLabel="Upgrade to Spotify Premium"
                onPress={() => void Linking.openURL(PREMIUM_URL)}
              />
            </View>
          </Card>
        ) : null}

        <Button
          label={
            link.isPending
              ? 'Connecting…'
              : status?.linked
                ? 'Reconnect Spotify'
                : 'Connect Spotify'
          }
          variant={status?.linked ? 'secondary' : 'primary'}
          accessibilityLabel="Connect Spotify"
          disabled={!ready || link.isPending || !idToken}
          onPress={() => link.mutate()}
        />
        {link.isError && link.error?.message !== 'cancelled' ? (
          <Text variant="caption" color="error">
            Couldn&apos;t connect Spotify. Please try again.
          </Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
