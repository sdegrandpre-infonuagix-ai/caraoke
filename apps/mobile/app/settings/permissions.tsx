import { Linking, Pressable, View } from 'react-native';
import { Redirect } from 'expo-router';
import { ScreenContainer, Text } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { usePermissions } from '../../src/permissions/usePermissions';
import {
  isRequired,
  permissionLabel,
  PERMISSION_DESCRIPTIONS,
  type PermissionType,
  type PermissionState,
} from '../../src/permissions/permissionStatus';

const PERMISSION_TITLES: Record<PermissionType, string> = {
  microphone: 'Microphone',
  location: 'Location',
  notifications: 'Notifications',
};

const ALL_TYPES: PermissionType[] = ['microphone', 'location', 'notifications'];

function stateColor(state: PermissionState): string {
  switch (state) {
    case 'granted':      return '#22c55e'; // green
    case 'denied':       return '#ef4444'; // red
    case 'undetermined': return '#f59e0b'; // amber
  }
}

/**
 * Permissions settings screen (Story 6.3, FR35).
 * Shows mic/location/notifications status independently; provides JIT request buttons
 * for optional permissions. Denial degrades gracefully — mic is the only hard requirement.
 */
export default function PermissionsSettingsScreen() {
  const status = useAuthStore((s) => s.status);
  const { perms, refresh, requestLocation, requestNotifications } = usePermissions();

  if (status === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const handleRequest = async (type: PermissionType) => {
    if (type === 'location') await requestLocation();
    else if (type === 'notifications') await requestNotifications();
    else await refresh(); // mic: direct to voice room — just refresh status
  };

  const handleOpenSettings = () => {
    void Linking.openSettings();
  };

  return (
    <ScreenContainer>
      <Text className="text-2xl font-bold mb-2">App Permissions</Text>
      <Text className="text-sm text-gray-500 mb-6">
        Each permission is independent — deny what you're not comfortable with.
        Only the microphone is required.
      </Text>

      {ALL_TYPES.map((type) => {
        const state = perms[type];
        const required = isRequired(type);
        return (
          <View key={type} className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-semibold">
                {PERMISSION_TITLES[type]}
                {required && (
                  <Text className="text-red-500"> *</Text>
                )}
              </Text>
              <Text style={{ color: stateColor(state), fontWeight: '600', fontSize: 13 }}>
                {permissionLabel(state)}
              </Text>
            </View>

            <Text className="text-sm text-gray-500 mb-3">
              {PERMISSION_DESCRIPTIONS[type]}
            </Text>

            {state === 'denied' ? (
              <Pressable
                onPress={handleOpenSettings}
                className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 self-start"
              >
                <Text className="text-sm font-medium">Open Settings</Text>
              </Pressable>
            ) : state === 'undetermined' && !required ? (
              <Pressable
                onPress={() => void handleRequest(type)}
                className="bg-blue-600 rounded-lg px-4 py-2 self-start"
              >
                <Text className="text-sm font-medium text-white">Allow</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </ScreenContainer>
  );
}
