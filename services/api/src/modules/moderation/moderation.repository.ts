import type { Pool } from 'pg';
import { getPool } from '../../db/pool.js';

export interface ReportRow {
  id: string;
  reporterId: string;
  reportedId: string;
  sessionId: string | null;
  reason: string | null;
  status: 'pending' | 'escalated' | 'resolved';
  resolutionNote: string | null;
  createdAt: Date;
}

export interface ModerationRepository {
  /** Idempotently record that fromUserId has blocked toUserId. */
  saveBlock(fromUserId: string, toUserId: string): Promise<void>;
  /** True if either user has blocked the other (bidirectional check). */
  isBlocked(userA: string, userB: string): Promise<boolean>;
  /** File a report; returns the new report id. */
  saveReport(
    reporterId: string,
    reportedId: string,
    sessionId: string | null,
    reason: string | null,
  ): Promise<string>;
  /** Count total reports against a user (for repeat-offender threshold). */
  countReportsAgainst(reportedId: string): Promise<number>;
  /** Mark all pending reports against a user as escalated (FR37). */
  escalateReportsAgainst(reportedId: string): Promise<void>;
  /** List unresolved reports for operator review queue. */
  listUnresolved(limit?: number): Promise<ReportRow[]>;
  /** Record a resolution action and mark the report resolved (audit trail). */
  resolveReport(reportId: string, note: string | null): Promise<void>;
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
  ): Promise<string> {
    const { rows } = await this.db().query<{ id: string }>(
      `INSERT INTO reports (reporter_id, reported_id, session_id, reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [reporterId, reportedId, sessionId, reason],
    );
    return rows[0]!.id;
  }

  async countReportsAgainst(reportedId: string): Promise<number> {
    const { rows } = await this.db().query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM reports WHERE reported_id = $1`,
      [reportedId],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  async escalateReportsAgainst(reportedId: string): Promise<void> {
    await this.db().query(
      `UPDATE reports SET status = 'escalated'
       WHERE reported_id = $1 AND status = 'pending'`,
      [reportedId],
    );
  }

  async listUnresolved(limit = 50): Promise<ReportRow[]> {
    const { rows } = await this.db().query<{
      id: string;
      reporter_id: string;
      reported_id: string;
      session_id: string | null;
      reason: string | null;
      status: string;
      resolution_note: string | null;
      created_at: Date;
    }>(
      `SELECT id, reporter_id, reported_id, session_id, reason, status, resolution_note, created_at
       FROM reports
       WHERE status IN ('pending', 'escalated')
       ORDER BY status DESC, created_at ASC
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reportedId: r.reported_id,
      sessionId: r.session_id,
      reason: r.reason,
      status: r.status as ReportRow['status'],
      resolutionNote: r.resolution_note,
      createdAt: r.created_at,
    }));
  }

  async resolveReport(reportId: string, note: string | null): Promise<void> {
    await this.db().query(
      `UPDATE reports SET status = 'resolved', resolution_note = $2 WHERE id = $1`,
      [reportId, note],
    );
  }
}
