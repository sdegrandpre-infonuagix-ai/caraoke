// ⚠️ THROWAWAY — Phase 0 harness coordinator (Story 1.3). Run with:
//   node --import tsx tools/phase0-harness/server/index.ts   (PORT=8787 by default)
//
// Responsibilities:
//   1. Pair two phones in a room.
//   2. Relay WebRTC voice signaling (SDP/ICE) between them — voice only, never song audio.
//   3. Answer clock-offset pings with server time.
//   4. On the operator's "start", schedule a SIMULTANEOUS absolute start for both phones.
//
// It is deliberately tiny and stateless-across-restarts. No auth, no persistence.

import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage, Role } from '../protocol.ts';
import { DEFAULT_PREROLL_MS } from '../protocol.ts';

const PORT = Number(process.env.PORT ?? 8787);

interface Member {
  socket: WebSocket;
  role: Role;
}

const rooms = new Map<string, Member[]>();

function send(socket: WebSocket, msg: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
}

function broadcast(roomId: string, msg: ServerMessage, except?: WebSocket): void {
  for (const m of rooms.get(roomId) ?? []) {
    if (m.socket !== except) send(m.socket, msg);
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (socket) => {
  let roomId: string | null = null;

  socket.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      send(socket, { type: 'error', message: 'invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'join': {
        roomId = msg.roomId;
        const members = rooms.get(roomId) ?? [];
        if (members.length >= 2) {
          send(socket, { type: 'error', message: 'room full (2 phones max)' });
          return;
        }
        members.push({ socket, role: msg.role });
        rooms.set(roomId, members);
        send(socket, { type: 'joined', roomId, role: msg.role, peers: members.length });
        broadcast(roomId, { type: 'peer-joined', peers: members.length }, socket);
        break;
      }
      case 'ping':
        send(socket, { type: 'pong', t0: msg.t0, serverTime: Date.now() });
        break;
      case 'offer':
        if (roomId) broadcast(roomId, { type: 'offer', sdp: msg.sdp }, socket);
        break;
      case 'answer':
        if (roomId) broadcast(roomId, { type: 'answer', sdp: msg.sdp }, socket);
        break;
      case 'ice':
        if (roomId) broadcast(roomId, { type: 'ice', candidate: msg.candidate }, socket);
        break;
      case 'start': {
        if (!roomId) return;
        const startAt = Date.now() + (msg.prerollMs ?? DEFAULT_PREROLL_MS);
        // Both phones (operator included) receive the same absolute start time + track.
        broadcast(roomId, { type: 'scheduled-start', trackUri: msg.trackUri, startAt });
        break;
      }
    }
  });

  socket.on('close', () => {
    if (!roomId) return;
    const members = (rooms.get(roomId) ?? []).filter((m) => m.socket !== socket);
    if (members.length === 0) rooms.delete(roomId);
    else {
      rooms.set(roomId, members);
      broadcast(roomId, { type: 'peer-left', peers: members.length });
    }
  });
});

// eslint-disable-next-line no-console
console.log(`[phase0-coordinator] listening on ws://0.0.0.0:${PORT}`);
