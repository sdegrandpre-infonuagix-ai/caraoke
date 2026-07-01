import type { DomainEventEnvelope, EventPublisher } from './index.js';

/** In-memory publisher for offline dev and deterministic CI; records published events. */
export class MockEventPublisher implements EventPublisher {
  readonly mode = 'mock' as const;
  readonly published: DomainEventEnvelope[] = [];

  async publish(event: DomainEventEnvelope): Promise<void> {
    this.published.push(event);
  }
}
