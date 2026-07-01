import { describe, it, expect } from 'vitest';
import { decideReady } from './ready.logic.js';
import { SessionReadyService } from './ready.service.js';
import { MockEventPublisher } from '../../events/index.js';
import type {
  CreateSessionInput,
  SessionRepository,
} from './pairing.repository.js';
import type { Session } from './pairing.types.js';

function makeSession(over: Partial<Session>): Session {
  const now = new Date(0).toISOString();
  return {
    id: 'sess-1',
    hostUserId: 'host',
    guestUserId: 'guest',
    status: 'pairing',
    hostReady: false,
    guestReady: false,
    pairingCode: 'ABC234',
    inviteToken: 'tok',
    expiresAt: new Date('2999-01-01').toISOString(),
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

/** Minimal repo backed by a single mutable session. */
class OneSessionRepo implements SessionRepository {
  constructor(public session: Session) {}
  async create(_i: CreateSessionInput): Promise<Session> {
    return this.session;
  }
  async findById(id: string) {
    return this.session.id === id ? this.session : null;
  }
  async findByPairingCode() {
    return null;
  }
  async findByInviteToken() {
    return null;
  }
  async addGuest() {
    return this.session;
  }
  async setReady(_id: string, role: 'host' | 'guest', ready: boolean) {
    this.session = {
      ...this.session,
      ...(role === 'host' ? { hostReady: ready } : { guestReady: ready }),
    };
    return this.session;
  }
  async updateStatus(_id: string, status: string) {
    this.session = { ...this.session, status: status as Session['status'] };
    return this.session;
  }
}

describe('decideReady (FR10, UX-DR2)', () => {
  it('first participant ready does not transition', () => {
    const d = decideReady(makeSession({}), 'host');
    expect(d).toMatchObject({ role: 'host', hostReady: true, guestReady: false, bothReady: false, transitioned: false });
    expect(d.nextStatus).toBe('pairing');
  });

  it('second participant ready transitions pairing -> ready', () => {
    const d = decideReady(makeSession({ hostReady: true }), 'guest');
    expect(d).toMatchObject({ role: 'guest', bothReady: true, transitioned: true, nextStatus: 'ready' });
  });

  it('rejects a non-participant', () => {
    expect(() => decideReady(makeSession({}), 'stranger')).toThrow(/not part of this session/);
  });

  it('rejects an ended session', () => {
    expect(() => decideReady(makeSession({ status: 'ended' }), 'host')).toThrow();
  });

  it('cannot be both-ready without a partner present', () => {
    const d = decideReady(makeSession({ guestUserId: null, hostReady: false }), 'host');
    expect(d.bothReady).toBe(false);
  });
});

describe('SessionReadyService.markReady', () => {
  it('publishes partner.ready and transitions to ready when both confirm', async () => {
    const repo = new OneSessionRepo(makeSession({ hostReady: true }));
    const events = new MockEventPublisher();
    const service = new SessionReadyService(repo, events, () => new Date('2026-06-25T00:00:00Z'));

    const state = await service.markReady('sess-1', 'guest');

    expect(state).toMatchObject({ status: 'ready', bothReady: true });
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({
      type: 'partner.ready',
      version: 1,
      sessionId: 'sess-1',
    });
  });

  it('does NOT publish on the first ready (no countdown until both)', async () => {
    const repo = new OneSessionRepo(makeSession({}));
    const events = new MockEventPublisher();
    const service = new SessionReadyService(repo, events);
    const state = await service.markReady('sess-1', 'host');
    expect(state.bothReady).toBe(false);
    expect(events.published).toHaveLength(0);
  });

  it('SESSION_NOT_FOUND for an unknown session', async () => {
    const repo = new OneSessionRepo(makeSession({}));
    const service = new SessionReadyService(repo, new MockEventPublisher());
    await expect(service.markReady('nope', 'host')).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });
});
