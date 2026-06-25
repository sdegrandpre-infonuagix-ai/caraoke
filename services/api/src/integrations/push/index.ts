// Push-notification integration abstraction (NFR20, FR11). The live Expo Push adapter (which
// brokers to APNs/FCM) and a sandbox mock sit behind one interface, selected by env. No module
// talks to the push provider directly.

import type { Env } from '../../config/env.js';
import { ExpoPushSender } from './live.js';
import { MockPushSender } from './mock.js';

export interface PushMessage {
  /** Device push token (Expo push token, brokered to APNs/FCM). */
  to: string;
  title: string;
  body: string;
  /** Arbitrary data payload; carries the deep-link URL + session id. */
  data?: Record<string, unknown>;
}

export interface PushSender {
  readonly mode: 'live' | 'mock';
  send(messages: PushMessage[]): Promise<void>;
}

export function getPushSender(env: Env): PushSender {
  return env.CARAOKE_INTEGRATIONS === 'live'
    ? new ExpoPushSender(env.EXPO_ACCESS_TOKEN)
    : new MockPushSender();
}

export { ExpoPushSender } from './live.js';
export { MockPushSender } from './mock.js';
