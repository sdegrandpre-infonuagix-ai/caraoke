import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card, Icon } from '../../src/components';
import { colors } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useMicConsent } from '../../src/voice/consentStore';
import { useVoiceRoom } from '../../src/voice/useVoiceRoom';

/**
 * Live-voice screen (Story 4.1, FR22/FR23/FR24). Gates on explicit microphone consent, then
 * opens the full-duplex voice plane via the LiveKit SFU and shows partner presence.
 */
export default function Voice() {
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const micConsented = useMicConsent((s) => s.micConsented);
  const grantMic = useMicConsent((s) => s.grantMic);

  // The hook is a no-op until consent is granted (FR22).
  const { status, partnerPresent } = useVoiceRoom(id);

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  if (!micConsented) {
    return (
      <ScreenContainer>
        <View className="flex-1 justify-center gap-xl">
          <View className="items-center gap-sm">
            <Icon name="mic-outline" size={48} color={colors.accent} accessibilityLabel={t('voice.title')} />
            <Text variant="h1">{t('voice.consentTitle')}</Text>
          </View>
          <Card>
            <Text color="secondary">{t('voice.consentBody')}</Text>
          </Card>
          <Button
            label={t('voice.allowMic')}
            accessibilityLabel={t('voice.allowMic')}
            onPress={grantMic}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-xl">
        <Text variant="h1">{t('voice.title')}</Text>

        <Card raised>
          <View className="flex-row items-center gap-sm">
            <Icon
              name={status === 'connected' ? 'mic' : 'sync'}
              color={status === 'connected' ? colors.success : colors.textSecondary}
              accessibilityLabel={t('voice.title')}
            />
            <Text variant="h3" color={status === 'connected' ? 'success' : 'secondary'}>
              {status === 'connected'
                ? t('voice.connected')
                : status === 'error'
                  ? t('voice.error')
                  : t('voice.connecting')}
            </Text>
          </View>
        </Card>

        {status === 'connected' ? (
          <Text color="secondary">
            {partnerPresent ? t('voice.partnerConnected') : t('voice.waitingPartner')}
          </Text>
        ) : null}

        {/* Move on to the singing screen (song request + synchronized playback). */}
        {status === 'connected' ? (
          <Button
            label="Start singing"
            accessibilityLabel="Start singing"
            onPress={() => router.replace(`/session/active?id=${id}`)}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
