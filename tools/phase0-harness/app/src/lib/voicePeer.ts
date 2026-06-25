// ⚠️ THROWAWAY — Phase 0 harness (Story 1.3). Full-duplex VOICE-ONLY WebRTC peer.
//
// NFR21 INVARIANT: the only media track ever added to this peer connection is the local
// MICROPHONE. The Spotify backing track is NEVER captured or sent here — each phone plays
// its own Spotify stream independently. Do not add any audio source other than the mic.

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  type MediaStream,
} from 'react-native-webrtc';
import type { SignalingClient } from './signalingClient.ts';

// Public STUN only; on carrier-grade NAT a TURN relay would be configured here.
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export interface VoicePeer {
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  /** Echo transport over the peer data channel — used by the Story 1.4 latency probe. */
  echoTransport(): import('../../../measure/voiceLatency.ts').EchoTransport;
  close(): void;
}

/**
 * Establish a full-duplex voice channel. The operator creates the offer; the partner
 * answers. Signaling (SDP/ICE) is relayed by the coordinator.
 */
export async function startVoicePeer(
  signaling: SignalingClient,
  isOfferer: boolean,
  onRemoteStream: (stream: MediaStream) => void,
): Promise<VoicePeer> {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // VOICE ONLY — audio:true, video:false. This is the sole media capture in the harness.
  const localStream = await mediaDevices.getUserMedia({ audio: true, video: false });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  let remoteStream: MediaStream | null = null;

  // Latency-probe data channel (Story 1.4). Offerer measures; answerer echoes.
  // Carries only tiny nonce strings — never media (NFR21 unaffected).
  let probeChannel: ReturnType<RTCPeerConnection['createDataChannel']> | null = null;
  const pendingProbes = new Map<string, () => void>();

  const wireProbeChannel = (
    channel: ReturnType<RTCPeerConnection['createDataChannel']>,
  ) => {
    probeChannel = channel;
    channel.addEventListener('message', (event) => {
      const nonce = String((event as unknown as { data: unknown }).data);
      const resolve = pendingProbes.get(nonce);
      if (resolve) {
        // Offerer side: the echo for a nonce we sent has returned.
        pendingProbes.delete(nonce);
        resolve();
      } else {
        // Answerer side: echo the nonce straight back.
        channel.send(nonce);
      }
    });
  };

  if (isOfferer) {
    wireProbeChannel(pc.createDataChannel('probe'));
  } else {
    pc.addEventListener('datachannel', (event) => {
      wireProbeChannel((event as unknown as { channel: RTCDataChannel }).channel);
    });
  }

  // react-native-webrtc emits events via addEventListener.
  pc.addEventListener('track', (event) => {
    const evt = event as unknown as { streams: MediaStream[] };
    if (evt.streams && evt.streams[0]) {
      remoteStream = evt.streams[0];
      onRemoteStream(remoteStream);
    }
  });

  pc.addEventListener('icecandidate', (event) => {
    const evt = event as unknown as { candidate: RTCIceCandidate | null };
    if (evt.candidate) signaling.send({ type: 'ice', candidate: evt.candidate });
  });

  signaling.on('offer', async ({ sdp }) => {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signaling.send({ type: 'answer', sdp: answer.sdp ?? '' });
  });

  signaling.on('answer', async ({ sdp }) => {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
  });

  signaling.on('ice', async ({ candidate }) => {
    if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate as never));
  });

  if (isOfferer) {
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    signaling.send({ type: 'offer', sdp: offer.sdp ?? '' });
  }

  return {
    localStream,
    get remoteStream() {
      return remoteStream;
    },
    echoTransport() {
      return {
        now: () => Date.now(),
        roundTrip: (nonce: string) =>
          new Promise<void>((resolve, reject) => {
            if (!probeChannel || probeChannel.readyState !== 'open') {
              reject(new Error('probe channel not open'));
              return;
            }
            pendingProbes.set(nonce, resolve);
            probeChannel.send(nonce);
          }),
      };
    },
    close() {
      localStream.getTracks().forEach((t) => t.stop());
      pc.close();
    },
  };
}
