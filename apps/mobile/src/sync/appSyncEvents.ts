// AppSync Events WebSocket subscription (Story 4.4). Thin client for the AWS AppSync Events
// pub/sub service — the channel `/caraoke/session/{id}` carries all in-session domain events
// (playback.scheduled, partner.ready, session.reconnecting, etc.).
// Protocol: connect → connection_ack → subscribe → data frames. API-key auth (device-safe).

import type { DomainEvent } from '@caraoke/shared';

/** Typed event carrying unknown data — the caller narrows by checking `event.type`. */
export type AnyDomainEvent = DomainEvent<unknown>;

// Build-time env — never a secret; API-key grants subscribe-only channel access.
const REALTIME_URL = process.env.EXPO_PUBLIC_APPSYNC_REALTIME_URL ?? '';
const API_KEY = process.env.EXPO_PUBLIC_APPSYNC_API_KEY ?? '';

interface AppSyncMessage {
  type: string;
  id?: string;
  channel?: string;
  event?: string;
  payload?: Record<string, unknown>;
}

/**
 * Subscribe to all domain events for a session. Returns an `unsubscribe` thunk.
 * Calling it while offline is safe — the subscription retries aren't wired (Story 4.8).
 * Events arrive parsed; unknown event types are forwarded so the caller can filter.
 */
export function subscribeSessionEvents(
  sessionId: string,
  onEvent: (event: AnyDomainEvent) => void,
  onError?: (err: string) => void,
): () => void {
  if (!REALTIME_URL || !API_KEY) {
    onError?.('EXPO_PUBLIC_APPSYNC_REALTIME_URL / EXPO_PUBLIC_APPSYNC_API_KEY not configured');
    return () => {};
  }

  const channel = `/caraoke/session/${sessionId}`;
  const subId = `sub-${sessionId}`;
  // API-key auth header encoded in the URL per AppSync Events WebSocket protocol.
  const authHeader = btoa(JSON.stringify({ 'x-api-key': API_KEY, host: new URL(REALTIME_URL.replace('wss://', 'https://')).host }));
  const wsUrl = `${REALTIME_URL}?header=${authHeader}&payload=${btoa('{}')}`;

  let ws: WebSocket | null = new WebSocket(wsUrl, ['aws-appsync-event-ws', 'header']);
  let closed = false;

  ws.onopen = () => {
    ws?.send(JSON.stringify({ type: 'connection_init' }));
  };

  ws.onmessage = (ev) => {
    let msg: AppSyncMessage;
    try {
      msg = JSON.parse(ev.data as string) as AppSyncMessage;
    } catch {
      return;
    }

    if (msg.type === 'connection_ack') {
      // Connection ready — subscribe to the session channel.
      ws?.send(JSON.stringify({
        type: 'subscribe',
        id: subId,
        channel,
        authorization: { 'x-api-key': API_KEY },
      }));
    } else if (msg.type === 'data' && msg.event) {
      try {
        const event = JSON.parse(msg.event) as AnyDomainEvent;
        onEvent(event);
      } catch {
        // Malformed event payload — ignore.
      }
    } else if (msg.type === 'connection_error' || msg.type === 'error') {
      onError?.(JSON.stringify(msg.payload ?? msg));
    }
  };

  ws.onerror = () => {
    if (!closed) onError?.('AppSync Events WebSocket error');
  };

  return () => {
    closed = true;
    try {
      ws?.send(JSON.stringify({ type: 'unsubscribe', id: subId }));
      ws?.close();
    } catch {
      // Socket may already be closing.
    }
    ws = null;
  };
}
