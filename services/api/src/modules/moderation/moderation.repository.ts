import type { Pool } from 'pg';
import { getPool } from '../../db/pool.js';

export interface ModerationRepository {
  /** Idempotently record that fromUserId has blocked toUserId. */
  saveBlock(fromUserId: string, toUserId: string): Promise<void>;
  /** True if either user has blocked the other (bidirectional check). */
  isBlocked(userA: string, userB: string): Promise<boolean>;
  /** File a report; sessionId and reason are optional context. */
  saveReport(
    reporterId: string,
    reportedId: string,
    sessionId: string | null,
    reason: string | null,
  ): Promise<void>;
}

export class PgModerationRepository implements ModerationRepository {
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async saveBlock(fromUserId: string, toUserId: string): Promise<void> {
    await this.db().query(
      `INSERT INTO blocks (from_user_id, to_user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [fromUserId, toUserId],
    );
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const { rows } = await this.db().query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM blocks
         WHERE (from_user_id = $1 AND to_user_id = $2)
            OR (from_user_id = $2 AND to_user_id = $1)
       ) AS exists`,
      [userA, userB],
    );
    return rows[0]?.exists ?? false;
  }

  async saveReport(
    reporterId: string,
    reportedId: string,
    sessionId: string | null,
    reason: string | null,
  ): Promise<void> {
    await this.db().query(
      `INSERT INTO reports (reporter_id, reported_id, session_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [reporterId, reportedId, sessionId, reason],
    );
  }
}
