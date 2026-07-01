import { ScrollView, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card, Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useSavedPartners, repairWith } from '../../src/api/partners';

/**
 * Saved partners + fast re-pair (Story 3.3, FR9). One tap creates a connected session with a
 * saved partner — no invite to share or code to type.
 */
export default function Partners() {
  const idToken = useAuthStore((s) => s.idToken);
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const router = useRouter();
  const partners = useSavedPartners();

  const repair = useMutation({
    mutationFn: (partnerUserId: string) => repairWith(idToken!, partnerUserId),
    onSuccess: (conn) => router.push(`/session/ready?id=${conn.session.id}`),
  });

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const items = partners.data?.items ?? [];

  return (
    <ScreenContainer>
      <Text variant="h1">{t('partners.title')}</Text>

      {items.length === 0 ? (
        <Card className="mt-lg">
          <Text color="secondary">{t('partners.empty')}</Text>
        </Card>
      ) : (
        <ScrollView className="mt-lg" contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
          {items.map((p) => {
            const name = p.displayName ?? t('partners.unknown');
            return (
              <Card key={p.partnerUserId}>
                <View className="flex-row items-center gap-md">
                  <Avatar name={name} size="md" partner="B" />
                  <View className="flex-1">
                    <Text variant="h3">{name}</Text>
                  </View>
                  <Button
                    label={
                      repair.isPending && repair.variables === p.partnerUserId
                        ? t('partners.connecting')
                        : t('partners.singAgain')
                    }
                    accessibilityLabel={`${t('partners.singAgain')} ${name}`}
                    disabled={repair.isPending || !idToken}
                    onPress={() => repair.mutate(p.partnerUserId)}
                  />
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
