// ⚠️ THROWAWAY — Phase 0 duet harness operator screen (Story 1.3).
//
// Manual two-phone flow:
//   1. Both phones: enter the same room, paste a Spotify Premium token + track URI, Connect.
//      → joins the coordinator, samples clock offset, opens the full-duplex VOICE peer.
//   2. Operator presses "Start countdown" → coordinator schedules an absolute start time.
//   3. Both phones begin their OWN Spotify playback at that instant (song never P2P, NFR21).

import { useCallback, useRef, useState } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import { SignalingClient } from './src/lib/signalingClient.ts';
import { startVoicePeer, type VoicePeer } from './src/lib/voicePeer.ts';
import { SpotifyClient } from './src/lib/spotifyClient.ts';
import {
  medianOffsetMs,
  msUntilStart,
  type ClockSample,
} from './src/lib/simultaneousStart.ts';
import type { Role } from '../protocol.ts';

const DEFAULT_URL = 'ws://192.168.0.10:8787'; // operator's laptop on the same hotspot
const DEFAULT_TRACK = 'spotify:track:4cOdK2wGLETKBW3PvgPWqT'; // Rick Astley — placeholder

export default function Operator() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [room, setRoom] = useState('montreal-highway');
  const [role, setRole] = useState<Role>('operator');
  const [token, setToken] = useState('');
  const [trackUri, setTrackUri] = useState(DEFAULT_TRACK);
  const [status, setStatus] = useState('idle');
  const [offset, setOffset] = useState<number | null>(null);

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<VoicePeer | null>(null);
  const spotifyRef = useRef<SpotifyClient | null>(null);
  const offsetRef = useRef(0);

  const sampleClock = useCallback(async (signaling: SignalingClient): Promise<number> => {
    const samples: ClockSample[] = [];
    await new Promise<void>((resolve) => {
      let pending = 5;
      signaling.on('pong', (msg) => {
        samples.push({ t0: msg.t0, serverTime: msg.serverTime, t1: Date.now() });
        if (--pending === 0) resolve();
      });
      for (let i = 0; i < 5; i++) signaling.send({ type: 'ping', t0: Date.now() });
    });
    return medianOffsetMs(samples);
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting…');
    const signaling = new SignalingClient(url);
    signalingRef.current = signaling;
    await signaling.ready();
    signaling.join(room, role);

    const measured = await sampleClock(signaling);
    offsetRef.current = measured;
    setOffset(Math.round(measured));

    spotifyRef.current = new SpotifyClient(token);

    // Operator offers; partner answers. Voice is full-duplex and voice-only (NFR21).
    peerRef.current = await startVoicePeer(signaling, role === 'operator', () =>
      setStatus('voice connected'),
    );

    // When the coordinator schedules the start, both phones begin their own Spotify stream.
    signaling.on('scheduled-start', (msg) => {
      const waitMs = msUntilStart(msg.startAt, Date.now(), offsetRef.current);
      setStatus(`starting in ${(waitMs / 1000).toFixed(2)}s`);
      setTimeout(() => {
        void spotifyRef.current?.play(msg.trackUri).then(() => setStatus('singing 🎤'));
      }, waitMs);
    });

    setStatus('connected — waiting for start');
  }, [url, room, role, token, sampleClock]);

  const startCountdown = useCallback(() => {
    signalingRef.current?.send({ type: 'start', trackUri });
  }, [trackUri]);

  const field = (label: string, value: string, onChange: (t: string) => void) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: '#999', padding: 8, borderRadius: 6 }}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Phase 0 Duet Harness</Text>
      <Text style={{ color: '#b00', marginBottom: 12 }}>⚠️ Throwaway prototype — not production.</Text>

      {field('Coordinator URL', url, setUrl)}
      {field('Room', room, setRoom)}
      {field('Role (operator/partner)', role, (t) => setRole(t === 'partner' ? 'partner' : 'operator'))}
      {field('Spotify Premium token', token, setToken)}
      {field('Track URI', trackUri, setTrackUri)}

      <View style={{ marginVertical: 8 }}>
        <Button title="Connect" onPress={() => void connect()} />
      </View>
      {role === 'operator' && (
        <Button title="Start countdown" onPress={startCountdown} />
      )}

      <Text style={{ marginTop: 16 }}>Status: {status}</Text>
      <Text>Clock offset: {offset === null ? '—' : `${offset}ms`}</Text>
    </ScrollView>
  );
}
