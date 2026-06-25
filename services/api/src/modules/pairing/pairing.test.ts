import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { PairingService } from './pairing.service.js';
import { IdentityService } from '../identity/identity.service.js';
import { generatePairingCode, generateInviteToken, buildInviteUrl } from './pairing.codes.js';
import type { CreateSessionInput, SessionRepository } from './pairing.repository.js';
import type { Session } from './pairing.types.js';
import type { UserRepository } from '../identity/identity.repository.js';
import type { AuthClaims, User } from '../identity/identity.types.js';
import type { TokenVerifier } from '../../middleware/auth.js';

class InMemorySessions implements SessionRepository {
  private byCode = new Map<string, Session>();
  private byToken = new Map<string, Session>();
  async create(input: CreateSessionInput): Promise<Session> {
    const now = new Date(0).toISOString();
    const session: Session = {
      id: `sess-${this.byCode.size + 1}`,
      hostUserId: input.hostUserId,
      status: 'pairing',
      pairingCode: input.pairingCode,
      inviteToken: input.inviteToken,
      expiresAt: input.expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    this.byCode.set(session.pairingCode, session);
    this.byToken.set(session.inviteToken, session);
    return session;
  }
  async findByPairingCode(code: string) {
    return this.byCode.get(code) ?? null;
  }
  async findByInviteToken(token: string) {
    return this.byToken.get(token) ?? null;
  }
}

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
      displayName: null,
      authProvider: claims.authProvider,
      languagePref: 'en',
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

describe('pairing code generation (FR7)', () => {
  it('pairing codes are 6 chars from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePairingCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('invite tokens are URL-safe and high-entropy', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(generateInviteToken()).not.toBe(token);
  });

  it('builds an invite URL that encodes the token', () => {
    expect(buildInviteUrl('https://caraoke.app/', 'abc')).toBe('https://caraoke.app/join?token=abc');
  });
});

describe('PairingService.createSession', () => {
  it('creates a pairing session with invite + expiry from the TTL', async () => {
    const fixedNow = new Date('2026-06-25T00:00:00.000Z');
    const service = new PairingService(new InMemorySessions(), {
      inviteBaseUrl: 'https://caraoke.app',
      ttlMinutes: 15,
      now: () => fixedNow,
    });

    const result = await service.createSession('user-1');

    expect(result.session.status).toBe('pairing');
    expect(result.invite.pairingCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(result.invite.inviteUrl).toContain('/join?token=');
    expect(result.invite.expiresAt).toBe('2026-06-25T00:15:00.000Z');
    // The raw invite token is never exposed on the session object.
    expect(JSON.stringify(result.session)).not.toContain('token');
  });
});

describe('POST /sessions', () => {
  const verifier: TokenVerifier = {
    async verify(token) {
      if (token !== 'good') throw new Error('bad');
      return { cognitoSub: 'sub-1', email: 'u@x.ca', authProvider: 'google' };
    },
  };
  const app = createApp({
    verifier,
    identityService: new IdentityService(new InMemoryUsers()),
    pairingService: new PairingService(new InMemorySessions(), {
      inviteBaseUrl: 'https://caraoke.app',
      ttlMinutes: 15,
    }),
  });

  it('401s without a token', async () => {
    expect((await request(app).post('/sessions')).status).toBe(401);
  });

  it('creates a session and returns the invite (201)', async () => {
    const res = await request(app).post('/sessions').set('Authorization', 'Bearer good');
    expect(res.status).toBe(201);
    expect(res.body.data.session.status).toBe('pairing');
    expect(res.body.data.invite.pairingCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(res.body.data.invite.inviteUrl).toContain('/join?token=');
  });
});
