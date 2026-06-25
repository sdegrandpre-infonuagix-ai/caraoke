import type { PushMessage, PushSender } from './index.js';

/** In-memory push sender for offline dev and deterministic CI; records sent messages. */
export class MockPushSender implements PushSender {
  readonly mode = 'mock' as const;
  readonly sent: PushMessage[] = [];

  async send(messages: PushMessage[]): Promise<void> {
    this.sent.push(...messages);
  }
}
