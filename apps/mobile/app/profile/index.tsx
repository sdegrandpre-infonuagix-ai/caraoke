import { useEffect, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
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

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (me.data) setDisplayName(me.data.displayName ?? '');
  }, [me.data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile(idToken!, { displayName: displayName.trim() || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const remove = useMutation({
    mutationFn: () => deleteAccount(idToken!),
    onSuccess: () => void signOut(),
  });

  if (status === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const confirmDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
      ],
    );
  };

  return (
    <ScreenContainer>
      <View className="flex-1 gap-xl">
        <Text variant="h1">Profile</Text>

        <Card>
          <View className="gap-sm">
            <Text variant="caption" color="secondary">
              Display name
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textDisabled}
              accessibilityLabel="Display name"
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
          label={save.isPending ? 'Saving…' : 'Save'}
          accessibilityLabel="Save profile"
          disabled={save.isPending || !idToken}
          onPress={() => save.mutate()}
        />
        {save.isError ? (
          <Text variant="caption" color="error">
            Couldn&apos;t save. Please try again.
          </Text>
        ) : null}

        <View className="mt-2xl gap-sm">
          <Text variant="h3" color="error">
            Danger zone
          </Text>
          <Button
            label={remove.isPending ? 'Deleting…' : 'Delete account'}
            variant="secondary"
            accessibilityLabel="Delete account"
            disabled={remove.isPending || !idToken}
            onPress={confirmDelete}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
