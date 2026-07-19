import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card, Icon } from '../../src/components';
import { colors } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { markReady, useReadyState, type ReadyState } from '../../src/api/ready';
import { connectSpotify } from '../../src/spotify/appRemote';

/**
 * Ready-handshake screen (Story 3.4, FR10). Tapping "I'm ready" marks readiness; the screen
 * polls until both partners are ready, then both are confirmed (the server transitions
 * pairing → ready and emits partner.ready over AppSync Events).
 */
export default function Ready() {
  const idToken = useAuthStore((s) => s.idToken);
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [iPressed, setIPressed] = useState(false);

  const state = useReadyState(id);

  // "I'm ready" also connects the on-device Spotify App Remote — which triggers the first-time
  // "Agree" in the Spotify app. Doing it HERE (before the duet) means both partners have agreed
  // by the time either can request a song, so the synchronized-start countdown never races the
  // authorization. Only mark ready once Spotify is connected.
  const ready = useMutation({
    mutationFn: async () => {
      await connectSpotify();
      return markReady(idToken!, String(id));
    },
    onSuccess: (s: ReadyState) => {
      setIPressed(true);
      queryClient.setQueryData(['ready', id], s);
    },
  });

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const both = state.data?.bothReady ?? false;
  const partnerReady = (state.data?.hostReady || state.data?.guestReady) ?? false;

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-xl">
        <View className="items-center gap-sm">
          <Text variant="h1">{t('ready.title')}</Text>
          <Text color="secondary">{t('ready.intro')}</Text>
        </View>

        {both ? (
          <View className="gap-md">
            <Card raised>
              <View className="flex-row items-center justify-center gap-sm">
                <Icon name="musical-notes" color={colors.success} accessibilityLabel={t('ready.bothReady')} />
                <Text variant="h3" color="success">
                  {t('ready.bothReady')}
                </Text>
              </View>
            </Card>
            <Button
              label={t('voice.open')}
              accessibilityLabel={t('voice.open')}
              onPress={() => router.push(`/session/voice?id=${id}`)}
            />
          </View>
        ) : (
          <Card>
            <Text color="secondary">
              {iPressed
                ? t('ready.waiting')
                : partnerReady
                  ? t('ready.partnerReady')
                  : t('ready.intro')}
            </Text>
          </Card>
        )}

        {!both ? (
          <Button
            label={
              ready.isPending
                ? 'Connecting Spotify…'
                : iPressed
                  ? t('ready.youAreReady')
                  : t('ready.imReady')
            }
            accessibilityLabel={t('ready.imReady')}
            disabled={iPressed || ready.isPending || !idToken || !id}
            onPress={() => ready.mutate()}
          />
        ) : null}

        {ready.isError ? (
          <Text variant="caption" color="error">
            Couldn’t connect Spotify. Make sure the Spotify app is installed, logged in, and Premium, then tap again.
          </Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
