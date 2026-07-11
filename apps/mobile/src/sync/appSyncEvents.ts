// AppSync Events WebSocket subscription (Story 4.4). Thin client for the AWS AppSync Events
// pub/sub service — the channel `/caraoke/session/{id}` carries all in-session domain events
// (playback.scheduled, partner.ready, session.reconnecting, etc.).
//
// Protocol (validated against the live endpoint): connect with subprotocols
// ['aws-appsync-event-ws', 'header-<base64url(auth)>'] → connection_init → connection_ack →
// subscribe → data frames. API-key auth. The auth `host` MUST be the HTTP (appsync-api) endpoint,
// not the realtime (appsync-realtime-api) one, even though we dial the realtime URL.

import type { DomainEvent } from '@caraoke/shared';

/** Typed event carrying unknown data — the caller narrows by checking `event.type`. */
export type AnyDomainEvent = DomainEvent<unknown>;

// Build-time env — never a secret; API-key grants subscribe-only channel access.
const REALTIME_URL = process.env.EXPO_PUBLIC_APPSYNC_REALTIME_URL ?? '';
const API_KEY = process.env.EXPO_PUBLIC_APPSYNC_API_KEY ?? '';

interface AppSyncMessage {
  type: string;
  id?: string;
  event?: string | string[];
  errors?: unknown;
}

/** Base64URL per the AppSync Events subprotocol spec (+/ → -_, no padding). */
function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Subscribe to all domain events for a session. Returns an `unsubscribe` thunk.
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

  // Auth host is the HTTP endpoint (appsync-api), derived from the realtime host.
  const httpHost = new URL(REALTIME_URL.replace('wss://', 'https://')).host.replace(
    'appsync-realtime-api',
    'appsync-api',
  );
  const auth = { host: httpHost, 'x-api-key': API_KEY };
  const channel = `/caraoke/session/${sessionId}`;
  const subId = `sub-${sessionId}`;

  // Auth travels in the subprotocol list (NOT a URL query param) for AppSync Events.
  let ws: WebSocket | null = new WebSocket(REALTIME_URL, [
    'aws-appsync-event-ws',
    `header-${base64url(JSON.stringify(auth))}`,
  ]);
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

    switch (msg.type) {
      case 'connection_ack':
        ws?.send(JSON.stringify({ type: 'subscribe', id: subId, channel, authorization: auth }));
        break;
      case 'ka': // keep-alive
      case 'subscribe_success':
        break;
      case 'data': {
        // `event` may be a single stringified event or an array of them.
        const raws = Array.isArray(msg.event) ? msg.event : msg.event != null ? [msg.event] : [];
        for (const raw of raws) {
          try {
            onEvent(JSON.parse(raw) as AnyDomainEvent);
          } catch {
            // Malformed event payload — ignore.
          }
        }
        break;
      }
      case 'connection_error':
      case 'subscribe_error':
      case 'broadcast_error':
      case 'error':
        onError?.(JSON.stringify(msg.errors ?? msg));
        break;
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
