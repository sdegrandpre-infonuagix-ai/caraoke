import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Button, Card, Icon } from '../src/components';
import { colors } from '../src/theme/tokens';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useSessionRole } from '../src/stores/useSessionRole';
import { joinSession, type SessionConnection } from '../src/api/pairing';
import { savePartner } from '../src/api/partners';

/**
 * Join a session via invite (Story 3.2, FR8). Accepts a pairing code typed by the user or an
 * invite token from a deep link (?token=...), auto-joining in the latter case. Invalid or
 * expired invites surface the server's clear {error} message as the recovery path.
 */
export default function Join() {
  const idToken = useAuthStore((s) => s.idToken);
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const setRole = useSessionRole((s) => s.setRole);

  const [code, setCode] = useState('');
  const autoJoined = useRef(false);

  const join = useMutation<SessionConnection, Error, { token?: string; code?: string }>({
    mutationFn: (invite) => joinSession(idToken!, invite),
    // The joiner is the guest — they sing along; the host picks the song.
    onSuccess: () => setRole('guest'),
  });

  // Save the host as a known partner (FR9) for one-tap re-pair next time.
  const save = useMutation({
    mutationFn: (partnerUserId: string) => savePartner(idToken!, partnerUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners'] }),
  });

  // Auto-join when arriving from an invite link.
  useEffect(() => {
    if (token && idToken && !autoJoined.current) {
      autoJoined.current = true;
      join.mutate({ token });
    }
  }, [token, idToken, join]);

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const connection = join.data;

  return (
    <ScreenContainer>
      <View className="flex-1 gap-xl">
        <View className="gap-sm">
          <Text variant="h1">{t('join.title')}</Text>
          <Text color="secondary">{t('join.intro')}</Text>
        </View>

        {connection ? (
          <Card>
            <View className="gap-sm">
              <View className="flex-row items-center gap-sm">
                <Icon name="checkmark-circle" color={colors.success} accessibilityLabel={t('join.connected')} />
                <Text variant="h3" color="success">
                  {t('join.connected')}
                </Text>
              </View>
              <Text color="secondary">
                {connection.bothConnected ? t('join.bothConnected') : t('join.waiting')}
              </Text>
              <Button
                label={t('ready.imReady')}
                accessibilityLabel={t('ready.imReady')}
                onPress={() => router.push(`/session/ready?id=${connection.session.id}`)}
              />
              <Button
                label={save.isSuccess ? t('partners.saved') : t('partners.save')}
                variant="secondary"
                accessibilityLabel={t('partners.save')}
                disabled={save.isPending || save.isSuccess}
                onPress={() => save.mutate(connection.host.userId)}
              />
            </View>
          </Card>
        ) : (
          <Card>
            <View className="gap-sm">
              <Text variant="caption" color="secondary">
                {t('join.codeLabel')}
              </Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                placeholder={t('join.codePlaceholder')}
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                accessibilityLabel={t('join.codeLabel')}
                style={{
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceRaised,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  minHeight: 48,
                  letterSpacing: 4,
                  fontSize: 20,
                }}
              />
            </View>
          </Card>
        )}

        {!connection ? (
          <Button
            label={join.isPending ? t('join.joining') : t('join.join')}
            accessibilityLabel={t('join.join')}
            disabled={join.isPending || code.length < 6 || !idToken}
            onPress={() => join.mutate({ code })}
          />
        ) : null}

        {join.isError ? (
          <Text variant="caption" color="error">
            {join.error?.message || t('join.error')}
          </Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
