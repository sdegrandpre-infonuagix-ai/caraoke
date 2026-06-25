import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { IdentityService } from './identity.service.js';
import type { UserRepository } from './identity.repository.js';
import type { AuthClaims, User } from './identity.types.js';
import { mapCognitoPayload, type TokenVerifier } from '../../middleware/auth.js';

/** In-memory repository for deterministic tests (no DB). */
class InMemoryUserRepository implements UserRepository {
  private byId = new Map<string, User>();
  public creates = 0;

  async findByCognitoSub(sub: string): Promise<User | null> {
    return [...this.byId.values()].find((u) => u.cognitoSub === sub) ?? null;
  }
  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  async create(claims: AuthClaims): Promise<User> {
    this.creates += 1;
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
}

describe('IdentityService.findOrCreate (FR1)', () => {
  it('creates a user on first sign-in and reuses it on return', async () => {
    const repo = new InMemoryUserRepository();
    const service = new IdentityService(repo);
    const claims: AuthClaims = {
      cognitoSub: 'sub-123',
      email: 'a@b.ca',
      displayName: 'Ada',
      authProvider: 'google',
    };

    const first = await service.findOrCreate(claims);
    const second = await service.findOrCreate(claims);

    expect(first.id).toBe(second.id);
    expect(repo.creates).toBe(1); // returning sign-in does not create a new record
    expect(first.authProvider).toBe('google');
  });
});

describe('mapCognitoPayload', () => {
  it('maps a Google federated identity', () => {
    const claims = mapCognitoPayload({
      sub: 's1',
      email: 'g@x.ca',
      name: 'Gina',
      identities: [{ providerName: 'Google' }],
    });
    expect(claims).toEqual({
      cognitoSub: 's1',
      email: 'g@x.ca',
      displayName: 'Gina',
      authProvider: 'google',
    });
  });

  it('maps Sign in with Apple', () => {
    const claims = mapCognitoPayload({ sub: 's2', email: 'a@x.ca', identities: [{ providerName: 'SignInWithApple' }] });
    expect(claims.authProvider).toBe('apple');
  });

  it('defaults to cognito when no federated identity', () => {
    expect(mapCognitoPayload({ sub: 's3', email: 'c@x.ca' }).authProvider).toBe('cognito');
  });
});

describe('GET /me (session sync)', () => {
  const fakeVerifier: TokenVerifier = {
    async verify(token) {
      if (token !== 'good') throw new Error('bad token');
      return { cognitoSub: 'sub-9', email: 'me@x.ca', displayName: 'Me', authProvider: 'apple' };
    },
  };
  const service = new IdentityService(new InMemoryUserRepository());
  const app = createApp({ verifier: fakeVerifier, identityService: service });

  it('401s without a bearer token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('401s on an invalid token', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  it('creates/returns the user for a valid token', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer good');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: expect.objectContaining({ email: 'me@x.ca', authProvider: 'apple' }),
      error: null,
    });
  });
});
