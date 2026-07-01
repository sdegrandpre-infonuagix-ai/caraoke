// AppSync Events publisher abstraction (NFR20, architecture: Real-time boundary). Domain
// events flow over AppSync Events; the live publisher and a mock sit behind one interface,
// selected by env. Envelopes are versioned `domain.action` past-tense (shared schema).

import type { DomainEventType } from '@caraoke/shared';
import type { Env } from '../config/env.js';
import { AppSyncEventPublisher } from './live.js';
import { MockEventPublisher } from './mock.js';

export interface DomainEventEnvelope<T = unknown> {
  type: DomainEventType;
  version: number;
  sessionId: string;
  occurredAt: string;
  data: T;
}

export interface EventPublisher {
  readonly mode: 'live' | 'mock';
  publish(event: DomainEventEnvelope): Promise<void>;
}

export function getEventPublisher(env: Env): EventPublisher {
  return env.CARAOKE_INTEGRATIONS === 'live'
    ? new AppSyncEventPublisher(env.APPSYNC_EVENTS_HTTP_URL, env.APPSYNC_EVENTS_API_KEY)
    : new MockEventPublisher();
}

export { AppSyncEventPublisher } from './live.js';
export { MockEventPublisher } from './mock.js';
