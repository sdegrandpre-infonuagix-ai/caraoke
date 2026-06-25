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
    close() {
      localStream.getTracks().forEach((t) => t.stop());
      pc.close();
    },
  };
}
