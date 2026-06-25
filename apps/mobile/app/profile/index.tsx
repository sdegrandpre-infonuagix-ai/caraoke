import { useEffect, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card } from '../../src/components';
import { colors } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useMe } from '../../src/api/useMe';
import { updateProfile, deleteAccount } from '../../src/api/profile';

/**
 * Profile management (Story 2.3). View/edit profile and delete the account. Edits persist via
 * the uniform {data,error} API; deletion is confirmed and irreversible (FR1, FR6).
 */
export default function Profile() {
  const idToken = useAuthStore((s) => s.idToken);
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);
  const me = useMe();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (me.data) setDisplayName(me.data.displayName ?? '');
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => updateProfile(idToken!, { displayName: displayName.trim() || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const remove = useMutation({
    mutationFn: () => deleteAccount(idToken!),
    onSuccess: () => void signOut(),
  });

  if (status === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const confirmDelete = () => {
    Alert.alert(t('profile.deleteConfirmTitle'), t('profile.deleteConfirmBody'), [
      { text: t('profile.cancel'), style: 'cancel' },
      { text: t('profile.delete'), style: 'destructive', onPress: () => remove.mutate() },
    ]);
  };

  return (
    <ScreenContainer>
      <View className="flex-1 gap-xl">
        <Text variant="h1">{t('profile.title')}</Text>

        <Card>
          <View className="gap-sm">
            <Text variant="caption" color="secondary">
              {t('profile.displayName')}
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor={colors.textDisabled}
              accessibilityLabel={t('profile.displayName')}
              style={{
                color: colors.textPrimary,
                backgroundColor: colors.surfaceRaised,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                minHeight: 48,
              }}
            />
            <Text variant="caption" color="secondary">
              {me.data?.email ?? ''}
            </Text>
          </View>
        </Card>

        <Button
          label={save.isPending ? t('common.saving') : t('common.save')}
          accessibilityLabel={t('common.save')}
          disabled={save.isPending || !idToken}
          onPress={() => save.mutate()}
        />
        {save.isError ? (
          <Text variant="caption" color="error">
            {t('profile.saveError')}
          </Text>
        ) : null}

        <View className="mt-2xl gap-sm">
          <Text variant="h3" color="error">
            {t('profile.dangerZone')}
          </Text>
          <Button
            label={remove.isPending ? t('profile.deleting') : t('profile.deleteAccount')}
            variant="secondary"
            accessibilityLabel={t('profile.deleteAccount')}
            disabled={remove.isPending || !idToken}
            onPress={confirmDelete}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
