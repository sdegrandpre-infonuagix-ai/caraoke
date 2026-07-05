// Song request (Story 4.3 MVP). Typed entry point for starting a duet song: the driver types a
// song + artist, the backend resolves it and schedules a synchronized start on BOTH phones
// (useScheduledStart drives the actual Spotify playback). Voice (speech-to-text) replaces the
// text field in a later pass for eyes-free requests.

import { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../Button';
import { Text } from '../Text';
import { useAuthStore } from '../../stores/useAuthStore';
import { requestSong } from '../../api/agent';
import { colors } from '../../theme/tokens';

export function SongRequest({ sessionId }: { sessionId: string }) {
  const idToken = useAuthStore((s) => s.idToken);
  const [query, setQuery] = useState('');

  const request = useMutation({
    mutationFn: () => requestSong(idToken!, sessionId, query.trim()),
  });

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Song and artist…"
        placeholderTextColor={colors.textDisabled}
        autoCorrect
        returnKeyType="go"
        onSubmitEditing={() => query.trim() && request.mutate()}
        accessibilityLabel="Song and artist"
        style={styles.input}
      />
      <Button
        label={request.isPending ? 'Finding…' : 'Sing this'}
        accessibilityLabel="Sing this song"
        disabled={!query.trim() || request.isPending || !idToken}
        onPress={() => request.mutate()}
      />
      {request.isError ? (
        <Text variant="caption" color="error">
          {request.error instanceof Error ? request.error.message : 'Could not start that song.'}
        </Text>
      ) : null}
      {request.isSuccess ? (
        <Text variant="caption" color="secondary">
          Starting {request.data.track.name} — {request.data.track.artist}…
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  input: {
    color: colors.textPrimary,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 17,
  },
});
