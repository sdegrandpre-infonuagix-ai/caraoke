import { Pressable, ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@caraoke/shared';
import { ScreenContainer, Text, Icon } from '../../src/components';
import { useLocale } from '../../src/i18n/useLocale';
import { useAuthStore } from '../../src/stores/useAuthStore';

/**
 * Language picker (Story 2.5, FR3). Lists the 25 supported languages by endonym; selecting
 * one switches the UI immediately and persists the preference to the profile.
 */
export default function LanguageScreen() {
  const { t } = useTranslation();
  const { current, change, pending } = useLocale();
  const status = useAuthStore((s) => s.status);

  if (status === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const currentBase = (current ?? 'en').split('-')[0];

  return (
    <ScreenContainer>
      <View className="gap-sm">
        <Text variant="h1">{t('language.title')}</Text>
        <Text color="secondary">{t('language.subtitle')}</Text>
      </View>

      <ScrollView className="mt-lg" contentContainerStyle={{ paddingBottom: 24 }}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const selected = lang.code === currentBase;
          return (
            <Pressable
              key={lang.code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${lang.name} (${lang.nativeName})`}
              disabled={pending}
              onPress={() => change(lang.code)}
              className="min-h-[48px] flex-row items-center justify-between border-b border-border py-md"
            >
              <View>
                <Text variant="body">{lang.nativeName}</Text>
                <Text variant="caption" color="secondary">
                  {lang.name}
                </Text>
              </View>
              {selected ? (
                <Icon name="checkmark" color="#FF6B6B" accessibilityLabel="Selected" />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}
