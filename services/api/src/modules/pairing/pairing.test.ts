import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { PairingService } from './pairing.service.js';
import { IdentityService } from '../identity/identity.service.js';
import { generatePairingCode, generateInviteToken, buildInviteUrl } from './pairing.codes.js';
import { validateJoin } from './pairing.validate.js';
import type { CreateSessionInput, SessionRepository } from './pairing.repository.js';
import type { Session } from './pairing.types.js';
import type { UserRepository } from '../identity/identity.repository.js';
import type { AuthClaims, User } from '../identity/identity.types.js';
import type { TokenVerifier } from '../../middleware/auth.js';

class InMemorySessions implements SessionRepository {
  private byId = new Map<string, Session>();
  async create(input: CreateSessionInput): Promise<Session> {
    const now = new Date(0).toISOString();
    const session: Session = {
      id: `sess-${this.byId.size + 1}`,
      hostUserId: input.hostUserId,
      guestUserId: input.guestUserId ?? null,
      status: 'pairing',
      hostReady: false,
      guestReady: false,
      pairingCode: input.pairingCode,
      inviteToken: input.inviteToken,
      expiresAt: input.expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(session.id, session);
    return session;
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByPairingCode(code: string) {
    return [...this.byId.values()].find((s) => s.pairingCode === code) ?? null;
  }
  async findByInviteToken(token: string) {
    return [...this.byId.values()].find((s) => s.inviteToken === token) ?? null;
  }
  async addGuest(sessionId: string, guestUserId: string) {
    const s = this.byId.get(sessionId);
    if (!s) return null;
    const updated = { ...s, guestUserId };
    this.byId.set(sessionId, updated);
    return updated;
  }
  async setReady(sessionId: string, role: 'host' | 'guest', ready: boolean) {
    const s = this.byId.get(sessionId);
    if (!s) return null;
    const updated = { ...s, ...(role === 'host' ? { hostReady: ready } : { guestReady: ready }) };
    this.byId.set(sessionId, updated);
    return updated;
  }
  async updateStatus(sessionId: string, status: string) {
    const s = this.byId.get(sessionId);
    if (!s) return null;
    const updated = { ...s, status: status as Session['status'] };
    this.byId.set(sessionId, updated);
    return updated;
  }
  /** Test helper: seed a session row directly. */
  seed(session: Session) {
    this.byId.set(session.id, session);
  }
}

function makeSession(over: Partial<Session>): Session {
  const now = new Date(0).toISOString();
  return {
    id: 'sess-seed',
    hostUserId: 'host-1',
    guestUserId: null,
    status: 'pairing',
    hostReady: false,
    guestReady: false,
    pairingCode: 'ABC234',
    inviteToken: 'tok-seed',
    expiresAt: new Date('2999-01-01T00:00:00.000Z').toISOString(),
    createdAt: now,
    updatedAt: now,
    ...over,
  };
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

describe('validateJoin (FR8)', () => {
  const now = new Date('2026-06-25T00:00:00.000Z');

  it('allows a fresh joiner', () => {
    expect(validateJoin(makeSession({}), 'joiner', now)).toEqual({ ok: true, alreadyJoined: false });
  });

  it('is idempotent for the existing guest', () => {
    const s = makeSession({ guestUserId: 'joiner' });
    expect(validateJoin(s, 'joiner', now)).toEqual({ ok: true, alreadyJoined: true });
  });

  it('rejects an expired invite with INVITE_EXPIRED', () => {
    const s = makeSession({ expiresAt: new Date('2020-01-01T00:00:00.000Z').toISOString() });
    const v = validateJoin(s, 'joiner', now);
    expect(v).toMatchObject({ ok: false, code: 'INVITE_EXPIRED' });
  });

  it('rejects the host joining their own session', () => {
    expect(validateJoin(makeSession({}), 'host-1', now)).toMatchObject({ ok: false, code: 'CONFLICT' });
  });

  it('rejects a third person when the session is full', () => {
    const s = makeSession({ guestUserId: 'someone-else' });
    expect(validateJoin(s, 'joiner', now)).toMatchObject({ ok: false, code: 'CONFLICT' });
  });

  it('rejects an ended session', () => {
    expect(validateJoin(makeSession({ status: 'ended' }), 'joiner', now)).toMatchObject({
      ok: false,
      code: 'CONFLICT',
    });
  });
});

describe('PairingService.join', () => {
  function service(repo: InMemorySessions) {
    return new PairingService(repo, { inviteBaseUrl: 'https://caraoke.app', ttlMinutes: 15 });
  }

  it('joins by token and connects both partners', async () => {
    const repo = new InMemorySessions();
    repo.seed(makeSession({ id: 's1', inviteToken: 'tok-1' }));
    const conn = await service(repo).join({ token: 'tok-1' }, 'joiner');
    expect(conn.bothConnected).toBe(true);
    expect(conn.guest).toEqual({ userId: 'joiner', connected: true });
  });

  it('joins by pairing code case-insensitively', async () => {
    const repo = new InMemorySessions();
    repo.seed(makeSession({ id: 's2', pairingCode: 'XYZ234', inviteToken: 't2' }));
    const conn = await service(repo).join({ code: 'xyz234' }, 'joiner');
    expect(conn.bothConnected).toBe(true);
  });

  it('throws SESSION_NOT_FOUND for an unknown invite', async () => {
    const repo = new InMemorySessions();
    await expect(service(repo).join({ token: 'nope' }, 'joiner')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
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

describe('POST /sessions/join', () => {
  const verifier: TokenVerifier = {
    async verify(token) {
      if (token !== 'good') throw new Error('bad');
      return { cognitoSub: 'sub-joiner', email: 'j@x.ca', authProvider: 'google' };
    },
  };
  const repo = new InMemorySessions();
  // Seed a session hosted by someone else, so the authenticated joiner can join it.
  repo.seed(makeSession({ id: 'sj', hostUserId: 'host-99', inviteToken: 'join-tok' }));
  const app = createApp({
    verifier,
    identityService: new IdentityService(new InMemoryUsers()),
    pairingService: new PairingService(repo, { inviteBaseUrl: 'https://caraoke.app', ttlMinutes: 15 }),
  });

  it('joins via a valid token and shows both connected (200)', async () => {
    const res = await request(app)
      .post('/sessions/join')
      .set('Authorization', 'Bearer good')
      .send({ token: 'join-tok' });
    expect(res.status).toBe(200);
    expect(res.body.data.bothConnected).toBe(true);
  });

  it('returns a clear error for an invalid invite (404 SESSION_NOT_FOUND)', async () => {
    const res = await request(app)
      .post('/sessions/join')
      .set('Authorization', 'Bearer good')
      .send({ token: 'does-not-exist' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    expect(res.body.error.message).toMatch(/new one/i);
  });

  it('rejects a body with neither token nor code (400)', async () => {
    const res = await request(app).post('/sessions/join').set('Authorization', 'Bearer good').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
