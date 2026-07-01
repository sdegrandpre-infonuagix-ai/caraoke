import { Switch, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDiscoveryStore } from '../../src/stores/useDiscoveryStore';
import { sonicNative } from '../../src/sonic/nativeBridge';

/**
 * Discovery settings screen (Story 5.1, FR27). Discoverability is off by default.
 * Toggling it on triggers a Riff-voiced rationale so the user understands what opting in means
 * before the setting is applied — never silently enrolled.
 */
export default function DiscoverySettingsScreen() {
  const { t, i18n } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const { discoverabilityEnabled, setDiscoverable } = useDiscoveryStore();

  if (status === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const handleToggle = (value: boolean) => {
    if (value) {
      // Riff explains what enabling discovery means before the setting takes effect (AC: FR27).
      sonicNative.speak(t('discovery.riffRationale'), i18n.language);
    }
    setDiscoverable(value);
  };

  return (
    <ScreenContainer>
      <View className="gap-sm">
        <Text variant="h1">{t('discovery.title')}</Text>
        <Text color="secondary">{t('discovery.description')}</Text>
      </View>

      <View className="mt-lg flex-row items-center justify-between border-b border-border py-md">
        <View className="mr-md flex-1">
          <Text variant="body">{t('discovery.toggleLabel')}</Text>
          <Text variant="caption" color="secondary">
            {t('discovery.toggleSublabel')}
          </Text>
        </View>
        <Switch
          value={discoverabilityEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#767577', true: '#FF6B6B' }}
          thumbColor={discoverabilityEnabled ? '#fff' : '#f4f3f4'}
          accessibilityLabel={t('discovery.toggleLabel')}
          accessibilityRole="switch"
          accessibilityState={{ checked: discoverabilityEnabled }}
        />
      </View>

      {discoverabilityEnabled ? (
        <View className="mt-md">
          <Text variant="caption" color="secondary">
            {t('discovery.enabledNote')}
          </Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
