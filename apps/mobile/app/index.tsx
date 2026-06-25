import { Text, View } from 'react-native';
import { SESSION_STATES, type SessionState } from '@caraoke/shared';

/**
 * Placeholder home route — proves the Expo Router app renders and that
 * cross-package imports from @caraoke/shared type-check end-to-end (Story 1.1).
 */
export default function Index() {
  const initialState: SessionState = SESSION_STATES[0];

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Caraoke</Text>
      <Text>Sing together across distance.</Text>
      <Text accessibilityLabel={`Session state ${initialState}`}>state: {initialState}</Text>
    </View>
  );
}
