import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { AgentService } from './agent.service.js';
import { AppSyncScheduledStartProducer, MIN_PREBUFFER_MS } from './scheduledStart.js';
import { MockEventPublisher } from '../../events/mock.js';
import { IdentityService } from '../identity/identity.service.js';
import type { UserRepository } from '../identity/identity.repository.js';
import type { AuthClaims, User } from '../identity/identity.types.js';
import type { TokenVerifier } from '../../middleware/auth.js';
import type { Session } from '../pairing/pairing.types.js';
import type { SessionParticipantGuard, TrackResolver, ScheduledStartProducer } from './agent.service.js';
import type { ResolvedTrack, SongRequestResult } from './agent.types.js';
import type { PlaybackPositionService } from './playback.service.js';
import { AppError } from '@caraoke/shared';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

class InMemoryUsers implements UserRepository {
  private byId = new Map<string, User>();
  async findByCognitoSub(sub: string) {
    return [...this.byId.values()].find((u) => u.cognitoSub === sub) ?? null;
  }
  async findById(id: string) { return this.byId.get(id) ?? null; }
  async create(claims: AuthClaims): Promise<User> {
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
  async update() { return null; }
  async deleteById() { return false; }
}

function makeSession(over: Partial<Session>): Session {
  const now = new Date(0).toISOString();
  return {
    id: 'sess-1',
    hostUserId: 'host-1',
    guestUserId: 'guest-1',
    status: 'ready',
    hostReady: true,
    guestReady: true,
    pairingCode: 'ABC234',
    inviteToken: 'tok-seed',
    expiresAt: new Date('2999-01-01').toISOString(),
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

const MOCK_TRACK: ResolvedTrack = {
  trackId: '4u7EnebtmKWzUH433cf5Qv',
  name: 'Bohemian Rhapsody',
  artist: 'Queen',
  uri: 'spotify:track:4u7EnebtmKWzUH433cf5Qv',
  durationMs: 354947,
};

const FIXED_SCHEDULED_AT = '2026-07-01T00:00:05.000Z';

class StubGuard implements SessionParticipantGuard {
  constructor(private readonly session: Session | null = makeSession({})) {}
  async assertParticipant(sessionId: string, userId: string) {
    if (!this.session) throw new AppError('SESSION_NOT_FOUND', 'Session not found.');
    if (this.session.hostUserId !== userId && this.session.guestUserId !== userId) {
      throw new AppError('FORBIDDEN', 'You are not part of this session.');
    }
    return this.session;
  }
}

class StubResolver implements TrackResolver {
  constructor(private readonly track: ResolvedTrack | null = MOCK_TRACK) {}
  async search(_query: string) { return this.track; }
}

class StubProducer implements ScheduledStartProducer {
  async schedule(_params: { sessionId: string; participantIds: string[]; track: ResolvedTrack }) {
    return { scheduledAt: FIXED_SCHEDULED_AT };
  }
}

// ---------------------------------------------------------------------------
// AgentService unit tests
// ---------------------------------------------------------------------------

describe('AgentService.handleSongRequest', () => {
  it('returns a resolved track and scheduledAt for a valid request', async () => {
    const service = new AgentService(new StubGuard(), new StubResolver(), new StubProducer());
    const result = await service.handleSongRequest('sess-1', 'host-1', 'Bohemian Rhapsody');
    expect(result.sessionId).toBe('sess-1');
    expect(result.track.name).toBe('Bohemian Rhapsody');
    expect(result.track.uri).toMatch(/^spotify:track:/);
    expect(result.scheduledAt).toBe(FIXED_SCHEDULED_AT);
  });

  it('includes both participants when scheduling', async () => {
    const scheduled: string[] = [];
    const producer: ScheduledStartProducer = {
      async schedule({ participantIds }) {
        scheduled.push(...participantIds);
        return { scheduledAt: FIXED_SCHEDULED_AT };
      },
    };
    const service = new AgentService(
      new StubGuard(makeSession({ hostUserId: 'host-x', guestUserId: 'guest-x' })),
      new StubResolver(),
      producer,
    );
    await service.handleSongRequest('sess-1', 'host-x', 'test');
    expect(scheduled).toContain('host-x');
    expect(scheduled).toContain('guest-x');
  });

  it('only includes the host when guest has not joined yet', async () => {
    const scheduled: string[] = [];
    const producer: ScheduledStartProducer = {
      async schedule({ participantIds }) {
        scheduled.push(...participantIds);
        return { scheduledAt: FIXED_SCHEDULED_AT };
      },
    };
    const service = new AgentService(
      new StubGuard(makeSession({ hostUserId: 'host-x', guestUserId: null })),
      new StubResolver(),
      producer,
    );
    await service.handleSongRequest('sess-1', 'host-x', 'test');
    expect(scheduled).toEqual(['host-x']);
  });

  it('throws FORBIDDEN when the caller is not a session participant', async () => {
    const guard = new StubGuard(makeSession({ hostUserId: 'host-1', guestUserId: 'guest-1' }));
    const service = new AgentService(guard, new StubResolver(), new StubProducer());
    await expect(service.handleSongRequest('sess-1', 'outsider', 'query')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('throws SESSION_NOT_FOUND when the session does not exist', async () => {
    const service = new AgentService(new StubGuard(null), new StubResolver(), new StubProducer());
    await expect(service.handleSongRequest('missing', 'host-1', 'query')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when the track resolver returns null', async () => {
    const service = new AgentService(new StubGuard(), new StubResolver(null), new StubProducer());
    await expect(
      service.handleSongRequest('sess-1', 'host-1', 'no such song ever'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// POST /sessions/:id/agent HTTP integration tests
// ---------------------------------------------------------------------------

const verifier: TokenVerifier = {
  async verify(token) {
    if (token !== 'good') throw new Error('bad token');
    return { cognitoSub: 'sub-1', email: 'u@x.ca', authProvider: 'google' };
  },
};

/** Build a mock AgentService to inject into createApp. */
function makeAgentService(result: SongRequestResult | AppError): AgentService {
  return {
    handleSongRequest: async () => {
      if (result instanceof AppError) throw result;
      return result;
    },
  } as unknown as AgentService;
}

const happyResult: SongRequestResult = {
  sessionId: 'sess-1',
  track: MOCK_TRACK,
  scheduledAt: FIXED_SCHEDULED_AT,
};

describe('POST /sessions/:id/agent', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = createApp({ verifier, agentService: makeAgentService(happyResult) });
    const res = await request(app).post('/sessions/sess-1/agent').send({ query: 'test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when the query field is missing', async () => {
    const app = createApp({ verifier, agentService: makeAgentService(happyResult) });
    const res = await request(app)
      .post('/sessions/sess-1/agent')
      .set('Authorization', 'Bearer good')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 400 when the query field is empty', async () => {
    const app = createApp({ verifier, agentService: makeAgentService(happyResult) });
    const res = await request(app)
      .post('/sessions/sess-1/agent')
      .set('Authorization', 'Bearer good')
      .send({ query: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 201 with track and scheduledAt on a valid request', async () => {
    const app = createApp({
      verifier,
      identityService: new IdentityService(new InMemoryUsers()),
      agentService: makeAgentService(happyResult),
    });
    const res = await request(app)
      .post('/sessions/sess-1/agent')
      .set('Authorization', 'Bearer good')
      .send({ query: 'Bohemian Rhapsody' });
    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.data.track.name).toBe('Bohemian Rhapsody');
    expect(res.body.data.scheduledAt).toBe(FIXED_SCHEDULED_AT);
    expect(res.body.data.track.uri).toMatch(/^spotify:track:/);
  });

  it('returns 403 when the caller is not a session participant', async () => {
    const app = createApp({
      verifier,
      identityService: new IdentityService(new InMemoryUsers()),
      agentService: makeAgentService(new AppError('FORBIDDEN', 'Not a participant.')),
    });
    const res = await request(app)
      .post('/sessions/sess-1/agent')
      .set('Authorization', 'Bearer good')
      .send({ query: 'some song' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 when the session is not found', async () => {
    const app = createApp({
      verifier,
      identityService: new IdentityService(new InMemoryUsers()),
      agentService: makeAgentService(new AppError('SESSION_NOT_FOUND', 'Session not found.')),
    });
    const res = await request(app)
      .post('/sessions/missing/agent')
      .set('Authorization', 'Bearer good')
      .send({ query: 'some song' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('returns 404 when no track matches the query', async () => {
    const app = createApp({
      verifier,
      identityService: new IdentityService(new InMemoryUsers()),
      agentService: makeAgentService(new AppError('NOT_FOUND', 'No tracks found.')),
    });
    const res = await request(app)
      .post('/sessions/sess-1/agent')
      .set('Authorization', 'Bearer good')
      .send({ query: 'asdfghjklzxcvbn' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// GET /sessions/:id/playback/position HTTP integration tests (Story 9.4)
// ---------------------------------------------------------------------------

function makePositionService(result: { positionMs: number } | AppError): PlaybackPositionService {
  return {
    getPosition: async () => {
      if (result instanceof AppError) throw result;
      return result;
    },
  };
}

describe('GET /sessions/:id/playback/position', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = createApp({
      verifier,
      playbackPositionService: makePositionService({ positionMs: 5_000 }),
    });
    const res = await request(app).get('/sessions/sess-1/playback/position');
    expect(res.status).toBe(401);
  });

  it('returns 200 with positionMs for a valid participant', async () => {
    const app = createApp({
      verifier,
      identityService: new IdentityService(new InMemoryUsers()),
      playbackPositionService: makePositionService({ positionMs: 3_000 }),
    });
    const res = await request(app)
      .get('/sessions/sess-1/playback/position')
      .set('Authorization', 'Bearer good');
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.positionMs).toBe(3_000);
  });

  it('returns 403 when the caller is not a session participant', async () => {
    const app = createApp({
      verifier,
      identityService: new IdentityService(new InMemoryUsers()),
      playbackPositionService: makePositionService(new AppError('FORBIDDEN', 'Not a participant.')),
    });
    const res = await request(app)
      .get('/sessions/sess-1/playback/position')
      .set('Authorization', 'Bearer good');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 when the session is not found', async () => {
    const app = createApp({
      verifier,
      identityService: new IdentityService(new InMemoryUsers()),
      playbackPositionService: makePositionService(new AppError('SESSION_NOT_FOUND', 'Session not found.')),
    });
    const res = await request(app)
      .get('/sessions/missing/playback/position')
      .set('Authorization', 'Bearer good');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// AppSyncScheduledStartProducer (Story 9.2) — producer-side tests
// ---------------------------------------------------------------------------

describe('AppSyncScheduledStartProducer', () => {
  it('publishes a playback.scheduled event with the correct envelope shape', async () => {
    const pub = new MockEventPublisher();
    const producer = new AppSyncScheduledStartProducer(pub);

    await producer.schedule({
      sessionId: 'sess-abc',
      participantIds: ['host-1', 'guest-2'],
      track: MOCK_TRACK,
    });

    expect(pub.published).toHaveLength(1);
    const evt = pub.published[0]!;
    expect(evt.type).toBe('playback.scheduled');
    expect(evt.version).toBe(1);
    expect(evt.sessionId).toBe('sess-abc');
    expect(evt.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('event data includes the resolved track fields', async () => {
    const pub = new MockEventPublisher();
    const producer = new AppSyncScheduledStartProducer(pub);

    await producer.schedule({
      sessionId: 'sess-abc',
      participantIds: ['host-1'],
      track: MOCK_TRACK,
    });

    const data = pub.published[0]!.data as Record<string, unknown>;
    expect(data.trackId).toBe(MOCK_TRACK.trackId);
    expect(data.trackUri).toBe(MOCK_TRACK.uri);
    expect(data.trackName).toBe(MOCK_TRACK.name);
    expect(data.artist).toBe(MOCK_TRACK.artist);
    expect(data.durationMs).toBe(MOCK_TRACK.durationMs);
  });

  it('event data includes all participant IDs so clients know who to sync with', async () => {
    const pub = new MockEventPublisher();
    const producer = new AppSyncScheduledStartProducer(pub);

    await producer.schedule({
      sessionId: 'sess-abc',
      participantIds: ['host-X', 'guest-Y'],
      track: MOCK_TRACK,
    });

    const data = pub.published[0]!.data as Record<string, unknown>;
    expect(data.participantIds).toContain('host-X');
    expect(data.participantIds).toContain('guest-Y');
  });

  it('schedules T at least MIN_PREBUFFER_MS in the future (NFR1: clients can prebuffer)', async () => {
    const before = Date.now();
    const pub = new MockEventPublisher();
    const producer = new AppSyncScheduledStartProducer(pub);

    const { scheduledAt } = await producer.schedule({
      sessionId: 'sess-abc',
      participantIds: ['host-1'],
      track: MOCK_TRACK,
    });

    const T = new Date(scheduledAt).getTime();
    expect(T).toBeGreaterThanOrEqual(before + MIN_PREBUFFER_MS);
  });

  it('returns scheduledAt that matches the published event data', async () => {
    const pub = new MockEventPublisher();
    const producer = new AppSyncScheduledStartProducer(pub);

    const { scheduledAt } = await producer.schedule({
      sessionId: 'sess-abc',
      participantIds: ['host-1'],
      track: MOCK_TRACK,
    });

    const data = pub.published[0]!.data as Record<string, unknown>;
    expect(scheduledAt).toBe(data.scheduledAt);
  });

  it('uses the configured prebufferMs when provided', async () => {
    const before = Date.now();
    const pub = new MockEventPublisher();
    const CUSTOM_MS = 5_000;
    const producer = new AppSyncScheduledStartProducer(pub, CUSTOM_MS);

    const { scheduledAt } = await producer.schedule({
      sessionId: 'sess-abc',
      participantIds: ['host-1'],
      track: MOCK_TRACK,
    });

    const T = new Date(scheduledAt).getTime();
    expect(T).toBeGreaterThanOrEqual(before + CUSTOM_MS);
  });
});
