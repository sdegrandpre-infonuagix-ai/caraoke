import { describe, it, expect } from 'vitest';
import { SavedPartnerService, type PairedSessionFactory } from './savedPartner.service.js';
import type { SavedPartnerRepository } from './savedPartner.repository.js';
import type { SavedPartnerView } from './savedPartner.types.js';
import type { SessionConnection } from './pairing.types.js';

class InMemorySavedPartners implements SavedPartnerRepository {
  private links = new Map<string, Set<string>>();
  async save(userId: string, partnerUserId: string) {
    if (!this.links.has(userId)) this.links.set(userId, new Set());
    this.links.get(userId)!.add(partnerUserId);
  }
  async exists(userId: string, partnerUserId: string) {
    return this.links.get(userId)?.has(partnerUserId) ?? false;
  }
  async list(userId: string): Promise<SavedPartnerView[]> {
    return [...(this.links.get(userId) ?? [])].map((partnerUserId) => ({
      partnerUserId,
      displayName: null,
      languagePref: 'en',
      savedAt: new Date(0).toISOString(),
    }));
  }
  async remove(userId: string, partnerUserId: string) {
    return this.links.get(userId)?.delete(partnerUserId) ?? false;
  }
}

// Records the (host, guest) pair the re-pair path would create a session for.
function stubPairing(): PairedSessionFactory & { calls: [string, string][] } {
  const calls: [string, string][] = [];
  return {
    calls,
    async createSessionWith(hostUserId: string, guestUserId: string): Promise<SessionConnection> {
      calls.push([hostUserId, guestUserId]);
      return {
        session: { id: 's1', status: 'pairing', expiresAt: 'x', createdAt: 'y' },
        host: { userId: hostUserId, connected: true },
        guest: { userId: guestUserId, connected: true },
        bothConnected: true,
      };
    },
  };
}

describe('SavedPartnerService (FR9)', () => {
  it('saves and lists a known partner', async () => {
    const repo = new InMemorySavedPartners();
    const service = new SavedPartnerService(repo, stubPairing());
    await service.save('me', 'partner');
    const list = await service.list('me');
    expect(list).toHaveLength(1);
    expect(list[0]!.partnerUserId).toBe('partner');
  });

  it('rejects saving yourself', async () => {
    const service = new SavedPartnerService(new InMemorySavedPartners(), stubPairing());
    await expect(service.save('me', 'me')).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('saving is idempotent', async () => {
    const repo = new InMemorySavedPartners();
    const service = new SavedPartnerService(repo, stubPairing());
    await service.save('me', 'partner');
    await service.save('me', 'partner');
    expect(await service.list('me')).toHaveLength(1);
  });

  it('fast re-pair creates a pre-assigned session with the saved partner', async () => {
    const repo = new InMemorySavedPartners();
    const pairing = stubPairing();
    const service = new SavedPartnerService(repo, pairing);
    await service.save('me', 'partner');

    const conn = await service.repair('me', 'partner');

    expect(conn.bothConnected).toBe(true);
    expect(pairing.calls).toEqual([['me', 'partner']]); // host=me, guest=partner, no invite step
  });

  it('refuses to re-pair with someone not saved', async () => {
    const service = new SavedPartnerService(new InMemorySavedPartners(), stubPairing());
    await expect(service.repair('me', 'stranger')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
