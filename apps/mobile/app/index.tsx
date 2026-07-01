import { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text, Avatar, Button } from '../src/components';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useMe } from '../src/api/useMe';
import { applyLanguage } from '../src/i18n/useLocale';

/**
 * Home route. Redirects to onboarding when signed out; otherwise greets the current user and
 * applies their saved language preference (FR3/FR5). Full home experience arrives in later epics.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);
  const me = useMe();
  const router = useRouter();
  const { t } = useTranslation();

  // Apply the user's saved language once their profile loads.
  const lang = me.data?.languagePref;
  useEffect(() => {
    if (lang) applyLanguage(lang);
  }, [lang]);

  if (status === 'loading') {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text color="secondary">{t('common.loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href="/(onboarding)/sign-in" />;
  }

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center gap-lg">
        <Avatar name={me.data?.displayName ?? me.data?.email ?? 'You'} size="lg" partner="A" />
        <Text variant="h2">{me.data?.displayName ?? me.data?.email ?? t('home.welcome')}</Text>
        <Text color="secondary">{t('home.signedIn')}</Text>
        <Button
          label={t('home.startDuet')}
          accessibilityLabel={t('home.startDuet')}
          onPress={() => router.push('/session/create')}
        />
        <Button
          label={t('home.joinDuet')}
          variant="secondary"
          accessibilityLabel={t('home.joinDuet')}
          onPress={() => router.push('/join')}
        />
        <Button
          label={t('home.savedPartners')}
          variant="secondary"
          accessibilityLabel={t('home.savedPartners')}
          onPress={() => router.push('/partners')}
        />
        <Button
          label={t('home.connectSpotify')}
          variant="secondary"
          accessibilityLabel={t('home.connectSpotify')}
          onPress={() => router.push('/spotify')}
        />
        <Button
          label={t('home.editProfile')}
          variant="secondary"
          accessibilityLabel={t('home.editProfile')}
          onPress={() => router.push('/profile')}
        />
        <Button
          label={t('home.language')}
          variant="secondary"
          accessibilityLabel={t('home.language')}
          onPress={() => router.push('/settings/language')}
        />
        <Button
          label={t('common.signOut')}
          variant="secondary"
          accessibilityLabel={t('common.signOut')}
          onPress={() => void signOut()}
        />
      </View>
    </ScreenContainer>
  );
}
