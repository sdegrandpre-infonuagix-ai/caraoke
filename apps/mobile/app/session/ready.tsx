import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card, Icon } from '../../src/components';
import { colors } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { markReady, useReadyState, type ReadyState } from '../../src/api/ready';

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
  const [iPressed, setIPressed] = useState(false);

  const state = useReadyState(id);

  const ready = useMutation({
    mutationFn: () => markReady(idToken!, String(id)),
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
          <Card raised>
            <View className="flex-row items-center justify-center gap-sm">
              <Icon name="musical-notes" color={colors.success} accessibilityLabel={t('ready.bothReady')} />
              <Text variant="h3" color="success">
                {t('ready.bothReady')}
              </Text>
            </View>
          </Card>
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
            label={iPressed ? t('ready.youAreReady') : t('ready.imReady')}
            accessibilityLabel={t('ready.imReady')}
            disabled={iPressed || ready.isPending || !idToken || !id}
            onPress={() => ready.mutate()}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
