import type { DomainEventEnvelope, EventPublisher } from './index.js';

/**
 * Live AppSync Events publisher. Posts the event to the AppSync Events HTTP endpoint on the
 * channel `/caraoke/session/<sessionId>`; subscribers (the two clients) receive it in
 * real time. Auth via the API key header. Wiring of the AppSync Events API itself is infra.
 */
export class AppSyncEventPublisher implements EventPublisher {
  readonly mode = 'live' as const;

  constructor(
    private readonly httpUrl: string | undefined,
    private readonly apiKey: string | undefined,
  ) {}

  async publish(event: DomainEventEnvelope): Promise<void> {
    if (!this.httpUrl || !this.apiKey) {
      throw new Error('AppSync Events is not configured (APPSYNC_EVENTS_HTTP_URL / API_KEY).');
    }
    const res = await fetch(this.httpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify({
        channel: `/caraoke/session/${event.sessionId}`,
        events: [JSON.stringify(event)],
      }),
    });
    if (!res.ok) {
      throw new Error(`AppSync Events publish failed: ${res.status}`);
    }
  }
}
