import { ActivityIndicator, Switch, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Text } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDiscoveryStore } from '../../src/stores/useDiscoveryStore';
import { useAgeVerification } from '../../src/ageVerification/useAgeVerification';
import { sonicNative } from '../../src/sonic/nativeBridge';

/**
 * Discovery settings screen (Story 5.1/5.2, FR27, FR32, NFR11).
 *
 * Gate logic:
 *  - is18Plus === null  → trigger one-time Stripe Identity age verification
 *  - is18Plus === false → warm blocked state, no toggle
 *  - is18Plus === true  → normal toggle; enabling speaks Riff rationale (FR27)
 */
export default function DiscoverySettingsScreen() {
  const { t, i18n } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const { discoverabilityEnabled, is18Plus, setDiscoverable, setAgeVerified } =
    useDiscoveryStore();
  const { verify, status: verifyStatus, loading } = useAgeVerification();

  if (status === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const handleToggle = async (value: boolean) => {
    if (!value) {
      setDiscoverable(false);
      return;
    }

    // Not yet verified — run one-time age check first.
    if (is18Plus === null) {
      const result = await verify();
      if (!result) return;  // cancelled or failed — UI already shows status
      setAgeVerified(result);
      if (result.is18Plus) {
        sonicNative.speak(t('discovery.riffRationale'), i18n.language);
        setDiscoverable(true);
      } else {
        sonicNative.speak(t('discovery.underageRiff'), i18n.language);
      }
      return;
    }

    // Already verified as adult.
    if (is18Plus) {
      sonicNative.speak(t('discovery.riffRationale'), i18n.language);
      setDiscoverable(true);
    }
  };

  const isVerifying = verifyStatus === 'verifying' || loading;
  const isUnderage = is18Plus === false || verifyStatus === 'underage';
  const verifyFailed = verifyStatus === 'failed';
  const toggleEnabled = is18Plus === true && !isVerifying;

  return (
    <ScreenContainer>
      <View className="gap-sm">
        <Text variant="h1">{t('discovery.title')}</Text>
        <Text color="secondary">{t('discovery.description')}</Text>
      </View>

      {isVerifying ? (
        <View className="mt-lg flex-row items-center gap-sm">
          <ActivityIndicator />
          <Text color="secondary">{t('discovery.verifying')}</Text>
        </View>
      ) : isUnderage ? (
        <View className="mt-lg gap-sm">
          <Text variant="body">{t('discovery.underageTitle')}</Text>
          <Text color="secondary">{t('discovery.underageBody')}</Text>
        </View>
      ) : verifyFailed ? (
        <View className="mt-lg gap-sm">
          <Text variant="body">{t('discovery.failedTitle')}</Text>
          <Text color="secondary">{t('discovery.failedBody')}</Text>
        </View>
      ) : (
        <View className="mt-lg flex-row items-center justify-between border-b border-border py-md">
          <View className="mr-md flex-1">
            <Text variant="body">{t('discovery.toggleLabel')}</Text>
            <Text variant="caption" color="secondary">
              {t('discovery.toggleSublabel')}
            </Text>
          </View>
          <Switch
            value={discoverabilityEnabled}
            onValueChange={(v) => void handleToggle(v)}
            disabled={!toggleEnabled && is18Plus !== null}
            trackColor={{ false: '#767577', true: '#FF6B6B' }}
            thumbColor={discoverabilityEnabled ? '#fff' : '#f4f3f4'}
            accessibilityLabel={t('discovery.toggleLabel')}
            accessibilityRole="switch"
            accessibilityState={{ checked: discoverabilityEnabled }}
          />
        </View>
      )}

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
