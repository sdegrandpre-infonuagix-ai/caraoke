import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Text } from '../../src/components';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { exportUserData } from '../../src/api/dataControls';
import { deleteAccount } from '../../src/api/profile';

interface Section {
  title: string;
  body: string;
}

const DATA_SECTIONS: Section[] = [
  {
    title: 'Voice',
    body:
      'Your voice is live-only and real-time. No recordings are made, and no voice fingerprints or biometric data are stored. Audio flows peer-to-peer via LiveKit SFU and is discarded immediately (NFR8).',
  },
  {
    title: 'Location',
    body:
      'When discovery is active, only a coarse area code (~5 km) is transmitted — precise GPS coordinates never leave your device. Location entries auto-expire after 5 minutes with no persistent trail (NFR9).',
  },
  {
    title: 'Profile & History',
    body:
      'Your display name, email, language preference, and pairing history are stored encrypted in AWS (ca-central-1). Data is retained for 90 days after account deletion, then permanently purged (NFR10).',
  },
  {
    title: 'Age verification',
    body:
      'Stripe Identity verifies your age. Caraoke stores only a boolean (18+) and a session reference — your ID document is never seen or stored by us (NFR11).',
  },
];

const PROCESSORS: { name: string; purpose: string }[] = [
  { name: 'LiveKit',          purpose: 'Real-time voice relay (SFU)' },
  { name: 'Stripe',           purpose: 'Payments and age verification' },
  { name: 'AWS Cognito',      purpose: 'Authentication and identity' },
  { name: 'AWS RDS/Redis',    purpose: 'Profile, session, and discovery data' },
  { name: 'Expo (Cloudflare)', purpose: 'Push notifications' },
];

/**
 * Privacy & data screen (Story 6.4, FR36/NFR8/NFR9/NFR10).
 * Shows retention, processors, and voice ephemerality. Provides data export and account
 * deletion — the two data-control actions (GDPR/CCPA right of access + erasure).
 */
export default function PrivacyScreen() {
  const idToken = useAuthStore((s) => s.idToken);
  const authStatus = useAuthStore((s) => s.status);
  const router = useRouter();

  if (authStatus === 'signedOut') return <Redirect href="/(onboarding)/sign-in" />;

  const handleExport = async () => {
    if (!idToken) return;
    try {
      await exportUserData(idToken);
      Alert.alert('Data export', 'Your data package has been prepared. Check your email within 24 hours.');
    } catch {
      Alert.alert('Export failed', 'Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!idToken) return;
            try {
              await deleteAccount(idToken);
              useAuthStore.getState().signOut();
              router.replace('/(onboarding)/sign-in');
            } catch {
              Alert.alert('Deletion failed', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 px-4 pt-6">
      <Text className="text-2xl font-bold mb-1">Privacy & Data</Text>
      <Text className="text-sm text-gray-500 mb-6">
        What Caraoke stores, how long we keep it, and who processes it.
      </Text>

      {DATA_SECTIONS.map((s) => (
        <View key={s.title} className="mb-5 p-4 bg-white dark:bg-gray-800 rounded-xl">
          <Text className="text-base font-semibold mb-1">{s.title}</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-300">{s.body}</Text>
        </View>
      ))}

      <Text className="text-base font-semibold mb-3 mt-2">Sub-processors</Text>
      <View className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl">
        {PROCESSORS.map((p) => (
          <View key={p.name} className="flex-row justify-between mb-2">
            <Text className="text-sm font-medium">{p.name}</Text>
            <Text className="text-sm text-gray-500 flex-shrink ml-4 text-right">{p.purpose}</Text>
          </View>
        ))}
      </View>

      <Text className="text-base font-semibold mb-3">Your data rights</Text>
      <Pressable
        onPress={() => void handleExport()}
        className="bg-blue-600 rounded-xl px-4 py-3 mb-3 items-center"
      >
        <Text className="text-white font-semibold">Export my data</Text>
      </Pressable>

      <Pressable
        onPress={handleDelete}
        className="bg-red-100 dark:bg-red-900 rounded-xl px-4 py-3 mb-10 items-center"
      >
        <Text className="text-red-700 dark:text-red-300 font-semibold">Delete account</Text>
      </Pressable>
    </ScrollView>
  );
}
