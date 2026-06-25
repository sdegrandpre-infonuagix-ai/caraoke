// LiveKit voice-room facade (Story 4.1, FR23/FR24). Connects to the SFU, publishes the mic
// (full duplex), and surfaces remote-participant presence. Voice media is SRTP/DTLS end-to-end
// by construction (LiveKit/WebRTC). The native audio path is provided by @livekit/react-native
// (built on react-native-webrtc) — auto-linked via its Expo config plugin.

import { registerGlobals, AudioSession } from '@livekit/react-native';
import { Room, RoomEvent } from 'livekit-client';
import type { VoiceGrant } from '../api/voice';

// Install the WebRTC globals once (idempotent).
registerGlobals();

export interface VoiceConnection {
  room: Room;
  disconnect: () => Promise<void>;
}

export interface VoiceCallbacks {
  onRemotePresence?: (present: boolean) => void;
  onDisconnected?: () => void;
}

/**
 * Open the voice plane: start the native audio session, connect to the room, and enable the
 * microphone (after consent). Remote audio tracks auto-play through the audio session so the
 * partner's live voice layers over each user's own Spotify playback (FR24).
 */
export async function connectVoiceRoom(
  grant: VoiceGrant,
  callbacks: VoiceCallbacks = {},
): Promise<VoiceConnection> {
  await AudioSession.startAudioSession();

  const room = new Room({ adaptiveStream: false, dynacast: false });

  room
    .on(RoomEvent.ParticipantConnected, () => callbacks.onRemotePresence?.(true))
    .on(RoomEvent.ParticipantDisconnected, () =>
      callbacks.onRemotePresence?.(room.remoteParticipants.size > 0),
    )
    .on(RoomEvent.Disconnected, () => callbacks.onDisconnected?.());

  await room.connect(grant.url, grant.token);
  // Full-duplex: publish our mic. This triggers the OS mic prompt if not yet granted.
  await room.localParticipant.setMicrophoneEnabled(true);

  // Reflect any participant already in the room.
  callbacks.onRemotePresence?.(room.remoteParticipants.size > 0);

  return {
    room,
    disconnect: async () => {
      await room.disconnect();
      await AudioSession.stopAudioSession();
    },
  };
}
