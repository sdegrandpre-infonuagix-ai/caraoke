// ⚠️ THROWAWAY — Phase 0 harness (Story 1.3). Thin typed WebSocket client to the
// coordinator. Relays WebRTC signaling and clock-offset probes; no media flows here.

import type { ClientMessage, ServerMessage, Role } from '../../../protocol.ts';

type Handler<T extends ServerMessage['type']> = (
  msg: Extract<ServerMessage, { type: T }>,
) => void;

export class SignalingClient {
  private ws: WebSocket;
  private handlers = new Map<ServerMessage['type'], Set<(msg: ServerMessage) => void>>();

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (ev: { data: unknown }) => {
      const msg = JSON.parse(String(ev.data)) as ServerMessage;
      this.handlers.get(msg.type)?.forEach((h) => h(msg));
    };
  }

  /** Resolve once the socket is open. */
  ready(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('signaling socket error'));
    });
  }

  join(roomId: string, role: Role): void {
    this.send({ type: 'join', roomId, role });
  }

  send(msg: ClientMessage): void {
    this.ws.send(JSON.stringify(msg));
  }

  on<T extends ServerMessage['type']>(type: T, handler: Handler<T>): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as (msg: ServerMessage) => void);
  }

  close(): void {
    this.ws.close();
  }
}
