import type { Pool } from 'pg';
import { rowToCamel } from '../../db/mapping.js';
import { getPool } from '../../db/pool.js';
import type { Session } from './pairing.types.js';

export interface CreateSessionInput {
  hostUserId: string;
  /** Pre-assigned guest for fast re-pair (Story 3.3); null for an open invite. */
  guestUserId?: string | null;
  status: string;
  pairingCode: string;
  inviteToken: string;
  expiresAt: Date;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByPairingCode(code: string): Promise<Session | null>;
  findByInviteToken(token: string): Promise<Session | null>;
  /** Set the guest (joiner) on a session. Returns the updated row, or null if missing. */
  addGuest(sessionId: string, guestUserId: string): Promise<Session | null>;
  /** Set a participant's readiness flag (Story 3.4). */
  setReady(sessionId: string, role: 'host' | 'guest', ready: boolean): Promise<Session | null>;
  /** Transition the session status (SessionStateMachine). */
  updateStatus(sessionId: string, status: string): Promise<Session | null>;
}

/** Postgres unique-violation error code (used to detect code/token collisions). */
export const PG_UNIQUE_VIOLATION = '23505';

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async create(input: CreateSessionInput): Promise<Session> {
    const { rows } = await this.db().query(
      `INSERT INTO sessions (host_user_id, guest_user_id, status, pairing_code, invite_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.hostUserId,
        input.guestUserId ?? null,
        input.status,
        input.pairingCode,
        input.inviteToken,
        input.expiresAt,
      ],
    );
    return rowToCamel<Session>(rows[0]!);
  }

  async findById(id: string): Promise<Session | null> {
    const { rows } = await this.db().query('SELECT * FROM sessions WHERE id = $1', [id]);
    return rows[0] ? rowToCamel<Session>(rows[0]) : null;
  }

  async findByPairingCode(code: string): Promise<Session | null> {
    const { rows } = await this.db().query('SELECT * FROM sessions WHERE pairing_code = $1', [
      code,
    ]);
    return rows[0] ? rowToCamel<Session>(rows[0]) : null;
  }

  async findByInviteToken(token: string): Promise<Session | null> {
    const { rows } = await this.db().query('SELECT * FROM sessions WHERE invite_token = $1', [
      token,
    ]);
    return rows[0] ? rowToCamel<Session>(rows[0]) : null;
  }

  async addGuest(sessionId: string, guestUserId: string): Promise<Session | null> {
    const { rows } = await this.db().query(
      `UPDATE sessions SET guest_user_id = $2, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [sessionId, guestUserId],
    );
    return rows[0] ? rowToCamel<Session>(rows[0]) : null;
  }

  async setReady(sessionId: string, role: 'host' | 'guest', ready: boolean): Promise<Session | null> {
    const column = role === 'host' ? 'host_ready' : 'guest_ready';
    const { rows } = await this.db().query(
      `UPDATE sessions SET ${column} = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [sessionId, ready],
    );
    return rows[0] ? rowToCamel<Session>(rows[0]) : null;
  }

  async updateStatus(sessionId: string, status: string): Promise<Session | null> {
    const { rows } = await this.db().query(
      `UPDATE sessions SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [sessionId, status],
    );
    return rows[0] ? rowToCamel<Session>(rows[0]) : null;
  }
}
