import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { SpotifyService } from './spotify.service.js';
import { IdentityService } from './identity.service.js';
import { MockSpotifyProvider } from '../../integrations/spotify/index.js';
import type { SpotifyLinkRepository, SpotifyLinkUpsert } from './spotify.repository.js';
import type { UserRepository } from './identity.repository.js';
import type { SpotifyLink } from './spotify.types.js';
import type { AuthClaims, User } from './identity.types.js';
import type { TokenVerifier } from '../../middleware/auth.js';

/** Minimal in-memory user repo so findOrCreate works without a DB. */
class InMemoryUsers implements UserRepository {
  private byId = new Map<string, User>();
  async findByCognitoSub(sub: string) {
    return [...this.byId.values()].find((u) => u.cognitoSub === sub) ?? null;
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async create(claims: AuthClaims) {
    const now = new Date(0).toISOString();
    const user: User = {
      id: `user-${this.byId.size + 1}`,
      cognitoSub: claims.cognitoSub,
      email: claims.email,
      displayName: claims.displayName ?? null,
      authProvider: claims.authProvider,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(user.id, user);
    return user;
  }
  async update() {
    return null;
  }
  async deleteById() {
    return false;
  }
}

class InMemorySpotifyLinkRepository implements SpotifyLinkRepository {
  private byUser = new Map<string, SpotifyLink>();
  async findByUserId(userId: string): Promise<SpotifyLink | null> {
    return this.byUser.get(userId) ?? null;
  }
  async upsert(input: SpotifyLinkUpsert): Promise<SpotifyLink> {
    const now = new Date(0).toISOString();
    const link: SpotifyLink = {
      userId: input.userId,
      spotifyUserId: input.spotifyUserId,
      product: input.product,
      isPremium: input.isPremium,
      displayName: input.displayName,
      linkedAt: now,
      updatedAt: now,
    };
    this.byUser.set(input.userId, link);
    return link;
  }
}

describe('SpotifyService.link (FR2)', () => {
  it('verifies Premium and stores the link', async () => {
    const service = new SpotifyService(new MockSpotifyProvider(), new InMemorySpotifyLinkRepository());
    const status = await service.link('user-1', 'premium-token');
    expect(status).toMatchObject({ linked: true, isPremium: true, product: 'premium' });
  });

  it('stores a non-Premium link as linked-but-not-premium (never silently accepted)', async () => {
    const service = new SpotifyService(new MockSpotifyProvider(), new InMemorySpotifyLinkRepository());
    const status = await service.link('user-2', 'free-token');
    expect(status.linked).toBe(true);
    expect(status.isPremium).toBe(false);
    expect(status.product).toBe('free');
  });

  it('reports unlinked status before linking', async () => {
    const service = new SpotifyService(new MockSpotifyProvider(), new InMemorySpotifyLinkRepository());
    expect(await service.getStatus('nobody')).toMatchObject({ linked: false, isPremium: false });
  });
});

describe('POST /me/spotify', () => {
  const verifier: TokenVerifier = {
    async verify(token) {
      if (token !== 'good') throw new Error('bad');
      return { cognitoSub: 'sub-1', email: 'u@x.ca', authProvider: 'google' };
    },
  };
  const spotifyService = new SpotifyService(
    new MockSpotifyProvider(),
    new InMemorySpotifyLinkRepository(),
  );
  const identityService = new IdentityService(new InMemoryUsers());
  const app = createApp({ verifier, spotifyService, identityService });

  it('links and verifies Premium for the authenticated user', async () => {
    const res = await request(app)
      .post('/me/spotify')
      .set('Authorization', 'Bearer good')
      .send({ accessToken: 'premium-token' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ linked: true, isPremium: true });
  });

  it('surfaces non-Premium plainly instead of failing', async () => {
    const res = await request(app)
      .post('/me/spotify')
      .set('Authorization', 'Bearer good')
      .send({ accessToken: 'free-token' });
    expect(res.status).toBe(200);
    expect(res.body.data.isPremium).toBe(false);
  });

  it('rejects a missing access token', async () => {
    const res = await request(app)
      .post('/me/spotify')
      .set('Authorization', 'Bearer good')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
