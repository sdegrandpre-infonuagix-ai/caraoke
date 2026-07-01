import { describe, it, expect } from 'vitest';
import { localizeNotification } from './push.strings.js';
import { NotificationService } from './notification.service.js';
import { MockPushSender } from '../../integrations/push/index.js';
import type { PushTokenRepository, PushTokenRow } from './pushToken.repository.js';

class InMemoryTokens implements PushTokenRepository {
  private byUser = new Map<string, PushTokenRow[]>();
  async upsert(userId: string, token: string, platform: string) {
    const list = this.byUser.get(userId) ?? [];
    list.push({ token, platform });
    this.byUser.set(userId, list);
  }
  async listForUser(userId: string) {
    return this.byUser.get(userId) ?? [];
  }
}

describe('localizeNotification (FR11/NFR19)', () => {
  it('localizes to the recipient language', () => {
    expect(localizeNotification('partner.ready', 'fr').title).toBe('Votre partenaire est prêt');
    expect(localizeNotification('invite', 'ar').title).toContain('كاراوكي');
  });

  it('falls back to English for unsupported languages', () => {
    expect(localizeNotification('invite', 'zz').title).toBe('Sing with Caraoke');
    // Region-tagged locales resolve to the base language.
    expect(localizeNotification('invite', 'fr-CA').title).toContain('Caraoke');
  });
});

describe('NotificationService.notify', () => {
  const lang = (l: string) => ({ getLanguage: async () => l });

  it('sends a localized, deep-linked push to each device token', async () => {
    const tokens = new InMemoryTokens();
    await tokens.upsert('u1', 'ExponentPushToken[a]', 'ios');
    await tokens.upsert('u1', 'ExponentPushToken[b]', 'android');
    const sender = new MockPushSender();
    const service = new NotificationService(tokens, sender, lang('fr'), 'caraoke');

    await service.notify('u1', 'partner.ready', { sessionId: 'sess-9' });

    expect(sender.sent).toHaveLength(2);
    expect(sender.sent[0]).toMatchObject({
      title: 'Votre partenaire est prêt',
      data: { type: 'partner.ready', url: 'caraoke://session/ready?id=sess-9', sessionId: 'sess-9' },
    });
  });

  it('no-ops when the user has no registered devices', async () => {
    const sender = new MockPushSender();
    const service = new NotificationService(new InMemoryTokens(), sender, lang('en'));
    await service.notify('nobody', 'invite', { sessionId: 's1' });
    expect(sender.sent).toHaveLength(0);
  });

  it('swallows sender errors (best-effort delivery)', async () => {
    const tokens = new InMemoryTokens();
    await tokens.upsert('u1', 'tok', 'ios');
    const failing = {
      mode: 'mock' as const,
      send: async () => {
        throw new Error('boom');
      },
    };
    const service = new NotificationService(tokens, failing, lang('en'));
    await expect(service.notify('u1', 'invite', { sessionId: 's1' })).resolves.toBeUndefined();
  });
});
