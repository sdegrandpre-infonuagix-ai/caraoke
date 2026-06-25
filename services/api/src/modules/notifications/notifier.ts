/** The kinds of push a session can trigger (FR11). */
export type NotificationType = 'invite' | 'partner.ready' | 'session.reconnecting';

export interface NotifyParams {
  sessionId: string;
}

/**
 * Minimal port the pairing services depend on to fire pushes, so they don't couple to the
 * concrete NotificationService (and a no-op can be injected in tests). Notifications are
 * best-effort — callers should not fail their request if a push fails.
 */
export interface Notifier {
  notify(userId: string, type: NotificationType, params: NotifyParams): Promise<void>;
}

/** No-op notifier (default when push isn't wired, e.g. unit tests). */
export class NoopNotifier implements Notifier {
  async notify(): Promise<void> {
    /* nothing */
  }
}
