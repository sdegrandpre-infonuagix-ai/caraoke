import { AppError } from '@caraoke/shared';
import type { CreateSessionInput, SessionRepository } from './pairing.repository.js';
import { PG_UNIQUE_VIOLATION } from './pairing.repository.js';
import { generatePairingCode, generateInviteToken, buildInviteUrl } from './pairing.codes.js';
import {
  toPublicSession,
  toConnection,
  type CreateSessionResult,
  type SessionConnection,
  type Session,
} from './pairing.types.js';
import { validateJoin } from './pairing.validate.js';

export interface JoinByInvite {
  token?: string;
  code?: string;
}

export interface PairingServiceOptions {
  inviteBaseUrl: string;
  ttlMinutes: number;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

/**
 * Session creation + invite generation (FR7). Produces a `sessions` record with a unique
 * pairing code and single-use invite token that expires after a defined window. On the
 * astronomically rare code/token collision, regenerates and retries.
 */
export class PairingService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly opts: PairingServiceOptions,
  ) {}

  async createSession(hostUserId: string): Promise<CreateSessionResult> {
    const session = await this.allocate(hostUserId, null);
    return {
      session: toPublicSession(session),
      invite: {
        pairingCode: session.pairingCode,
        inviteUrl: buildInviteUrl(this.opts.inviteBaseUrl, session.inviteToken),
        expiresAt: session.expiresAt,
      },
    };
  }

  /**
   * Create a session with the partner pre-assigned (Story 3.3 fast re-pair, FR9). No invite
   * sharing is needed, so both partners are connected immediately — the path from intent to a
   * connected session is a single request.
   */
  async createSessionWith(hostUserId: string, guestUserId: string): Promise<SessionConnection> {
    const session = await this.allocate(hostUserId, guestUserId);
    return toConnection(session);
  }

  /** Allocate a session row, retrying on the rare pairing-code/invite-token collision. */
  private async allocate(hostUserId: string, guestUserId: string | null): Promise<Session> {
    const now = this.opts.now?.() ?? new Date();
    const expiresAt = new Date(now.getTime() + this.opts.ttlMinutes * 60_000);

    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const input: CreateSessionInput = {
        hostUserId,
        guestUserId,
        status: 'pairing',
        pairingCode: generatePairingCode(),
        inviteToken: generateInviteToken(),
        expiresAt,
      };
      try {
        return await this.sessions.create(input);
      } catch (err) {
        if (isUniqueViolation(err) && attempt < maxAttempts) continue;
        throw err;
      }
    }
    throw new AppError('CONFLICT', 'Could not allocate a unique invite. Please retry.');
  }

  /**
   * Join a session via invite token (link) or pairing code (FR8). Validates existence,
   * expiry, and capacity, returning a clear error (with a recovery hint) otherwise. On
   * success both partners are connected. Idempotent for the existing guest.
   */
  async join(invite: JoinByInvite, joinerUserId: string): Promise<SessionConnection> {
    const session = await this.resolve(invite);
    if (!session) {
      throw new AppError('SESSION_NOT_FOUND', 'That invite is invalid. Ask your partner for a new one.');
    }

    const now = this.opts.now?.() ?? new Date();
    const verdict = validateJoin(session, joinerUserId, now);
    if (!verdict.ok) {
      throw new AppError(verdict.code, verdict.message);
    }
    if (verdict.alreadyJoined) {
      return toConnection(session);
    }

    const updated = await this.sessions.addGuest(session.id, joinerUserId);
    if (!updated) {
      throw new AppError('SESSION_NOT_FOUND', 'That session no longer exists. Ask your partner for a new invite.');
    }
    return toConnection(updated);
  }

  /**
   * Return the session if `userId` is a participant (host or guest), else throw. Used to gate
   * the voice-token endpoint so only the two singers can join the room (Story 4.1).
   */
  async assertParticipant(sessionId: string, userId: string): Promise<Session> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found.');
    if (session.hostUserId !== userId && session.guestUserId !== userId) {
      throw new AppError('FORBIDDEN', 'You are not part of this session.');
    }
    return session;
  }

  private async resolve(invite: JoinByInvite): Promise<Session | null> {
    if (invite.token) return this.sessions.findByInviteToken(invite.token);
    if (invite.code) {
      // Pairing codes are case-insensitive for the user; stored uppercase.
      return this.sessions.findByPairingCode(invite.code.trim().toUpperCase());
    }
    return null;
  }
}
