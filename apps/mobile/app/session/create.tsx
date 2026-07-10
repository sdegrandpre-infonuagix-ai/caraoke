import { Share, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useSessionRole } from '../../src/stores/useSessionRole';
import { createSession, type CreateSessionResult } from '../../src/api/pairing';

/**
 * Create a duet session and show the invite (Story 3.1, FR7). The host shares the link or
 * the pairing code; the partner joins in Story 3.2.
 */
export default function CreateSession() {
  const idToken = useAuthStore((s) => s.idToken);
  const authStatus = useAuthStore((s) => s.status);
  const setRole = useSessionRole((s) => s.setRole);
  const router = useRouter();
  const { t } = useTranslation();

  const create = useMutation<CreateSessionResult>({
    mutationFn: () => createSession(idToken!),
    // The creator is the host — the one who drives song selection in the duet.
    onSuccess: () => setRole('host'),
  });

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const invite = create.data?.invite;

  const onShare = () => {
    if (!invite) return;
    void Share.share({
      message: t('session.shareMessage', { url: invite.inviteUrl, code: invite.pairingCode }),
    });
  };

  return (
    <ScreenContainer>
      <View className="flex-1 gap-xl">
        <View className="gap-sm">
          <Text variant="h1">{t('session.title')}</Text>
          <Text color="secondary">{t('session.intro')}</Text>
        </View>

        {invite ? (
          <Card>
            <View className="gap-lg">
              <View className="gap-xs">
                <Text variant="caption" color="secondary">
                  {t('session.pairingCode')}
                </Text>
                <Text variant="display" accessibilityLabel={`${t('session.pairingCode')} ${invite.pairingCode.split('').join(' ')}`}>
                  {invite.pairingCode}
                </Text>
              </View>
              <View className="gap-xs">
                <Text variant="caption" color="secondary">
                  {t('session.inviteLink')}
                </Text>
                <Text variant="body">{invite.inviteUrl}</Text>
              </View>
              <Button
                label={t('session.share')}
                accessibilityLabel={t('session.share')}
                onPress={onShare}
              />
            </View>
          </Card>
        ) : null}

        {invite && create.data ? (
          <Button
            label="Continue"
            accessibilityLabel="Continue to the duet"
            onPress={() => router.push(`/session/ready?id=${create.data.session.id}`)}
          />
        ) : null}

        <Button
          label={create.isPending ? t('session.creating') : t('session.start')}
          variant={invite ? 'secondary' : 'primary'}
          accessibilityLabel={t('session.start')}
          disabled={create.isPending || !idToken}
          onPress={() => create.mutate()}
        />
        {create.isError ? (
          <Text variant="caption" color="error">
            {t('session.error')}
          </Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
