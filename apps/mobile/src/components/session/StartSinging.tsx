// "Start singing" gate (both participants must tap before the synchronized start). Shows the song
// the host picked; each phone confirms independently. When both have confirmed the backend
// schedules playback and useScheduledStart takes over — the store clears and this unmounts.

import { View, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Button, Text, Card } from '../index';
import { useAuthStore } from '../../stores/useAuthStore';
import { useStartHandshake } from '../../stores/useStartHandshake';
import { confirmStart } from '../../api/agent';

export function StartSinging({ sessionId }: { sessionId: string }) {
  const idToken = useAuthStore((s) => s.idToken);
  const track = useStartHandshake((s) => s.proposedTrack);
  const iConfirmed = useStartHandshake((s) => s.iConfirmed);
  const setConfirmed = useStartHandshake((s) => s.setConfirmed);

  const confirm = useMutation({
    mutationFn: () => confirmStart(idToken!, sessionId),
    onSuccess: () => setConfirmed(),
  });

  if (!track) return null;

  return (
    <View style={styles.container}>
      <Card raised style={styles.trackCard}>
        <Text variant="h3">{track.trackName}</Text>
        {track.artist ? <Text color="secondary">{track.artist}</Text> : null}
      </Card>

      {iConfirmed ? (
        <Text color="secondary" style={styles.waiting}>
          Waiting for your partner to tap Start singing…
        </Text>
      ) : (
        <Button
          label={confirm.isPending ? 'Starting…' : 'Start singing'}
          accessibilityLabel="Start singing together"
          disabled={confirm.isPending || !idToken}
          onPress={() => confirm.mutate()}
        />
      )}

      {confirm.isError ? (
        <Text variant="caption" color="error">
          Couldn’t start — make sure your partner is still in the session, then tap again.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  trackCard: { alignItems: 'center', gap: 4, paddingVertical: 16 },
  waiting: { textAlign: 'center' },
});
