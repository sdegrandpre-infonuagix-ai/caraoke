import { z } from 'zod';

/**
 * Domain event envelope for AppSync Events (architecture: Communication Patterns).
 * Event names are `domain.action` past tense; envelope is versioned from day one.
 */
export const DOMAIN_EVENT_TYPES = [
  'session.started',
  'partner.ready',
  // Host picked a song; both phones show it and must tap "Start singing" before playback.
  'song.proposed',
  // A participant tapped "Start singing" (carries progress until all have confirmed).
  'start.confirmed',
  'session.reconnecting',
  'playback.scheduled',
  'session.ended',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export function domainEventSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    type: z.enum(DOMAIN_EVENT_TYPES),
    version: z.number().int().positive(),
    sessionId: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }),
    data: dataSchema,
  });
}

export type DomainEvent<T> = {
  type: DomainEventType;
  version: number;
  sessionId: string;
  occurredAt: string;
  data: T;
};
