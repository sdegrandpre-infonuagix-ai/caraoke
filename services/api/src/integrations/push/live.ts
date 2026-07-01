import type { PushMessage, PushSender } from './index.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Live push sender via the Expo Push Service, which delivers to APNs (iOS) and FCM (Android).
 * Batches are capped at 100 messages per Expo request.
 */
export class ExpoPushSender implements PushSender {
  readonly mode = 'live' as const;

  constructor(private readonly accessToken?: string) {}

  async send(messages: PushMessage[]): Promise<void> {
    if (messages.length === 0) return;

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        },
        body: JSON.stringify(
          batch.map((m) => ({ to: m.to, title: m.title, body: m.body, data: m.data })),
        ),
      });
      if (!res.ok) {
        throw new Error(`Expo push failed: ${res.status}`);
      }
    }
  }
}
