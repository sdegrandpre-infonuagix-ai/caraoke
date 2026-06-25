import type { PushSender } from '../../integrations/push/index.js';
import type { PushTokenRepository } from './pushToken.repository.js';
import { localizeNotification } from './push.strings.js';
import type { Notifier, NotificationType, NotifyParams } from './notifier.js';

/** Looks up a user's preferred language for localized pushes (FR11/NFR19). */
export interface UserLanguageLookup {
  getLanguage(userId: string): Promise<string | null>;
}

/**
 * Delivers localized, deep-linked push notifications (FR11). Notifications are localized to
 * the recipient's profile language and carry a deep link to the relevant session. Delivery is
 * best-effort: failures are swallowed so they never break the triggering request.
 */
export class NotificationService implements Notifier {
  constructor(
    private readonly tokens: PushTokenRepository,
    private readonly sender: PushSender,
    private readonly users: UserLanguageLookup,
    private readonly appScheme = 'caraoke',
  ) {}

  async registerToken(userId: string, token: string, platform: string): Promise<void> {
    await this.tokens.upsert(userId, token, platform);
  }

  private deepLink(params: NotifyParams): string {
    // All session pushes route the user to the relevant session's ready screen.
    return `${this.appScheme}://session/ready?id=${params.sessionId}`;
  }

  async notify(userId: string, type: NotificationType, params: NotifyParams): Promise<void> {
    try {
      const tokens = await this.tokens.listForUser(userId);
      if (tokens.length === 0) return;

      const language = (await this.users.getLanguage(userId)) ?? 'en';
      const { title, body } = localizeNotification(type, language);
      const url = this.deepLink(params);

      await this.sender.send(
        tokens.map((t) => ({
          to: t.token,
          title,
          body,
          data: { type, url, sessionId: params.sessionId },
        })),
      );
    } catch (err) {
      // Best-effort: log and move on (no PII).
      console.error('[notifications] push failed', { type, message: (err as Error)?.message });
    }
  }
}
