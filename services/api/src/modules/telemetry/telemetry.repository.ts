import type { Pool } from 'pg';
import { getPool } from '../../db/pool.js';

export interface FeltTogetherRate {
  rate: number;
  yesCount: number;
  totalResponded: number;
  windowDays: number;
}

export interface TelemetryRepository {
  /** Persist a single felt-together sentiment response (FR42 capture). */
  saveFeltTogether(
    userId: string,
    sessionId: string,
    sentiment: string,
    timestamp: Date,
  ): Promise<void>;
  /** Aggregate the felt-together rate over the last N days (FR42 aggregation). */
  getFeltTogetherRate(windowDays: number): Promise<FeltTogetherRate>;
}

export class PgTelemetryRepository implements TelemetryRepository {
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async saveFeltTogether(
    userId: string,
    sessionId: string,
    sentiment: string,
    timestamp: Date,
  ): Promise<void> {
    await this.db().query(
      `INSERT INTO felt_together_responses (user_id, session_id, sentiment, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, session_id) DO UPDATE
         SET sentiment = EXCLUDED.sentiment, created_at = EXCLUDED.created_at`,
      [userId, sessionId, sentiment, timestamp],
    );
  }

  async getFeltTogetherRate(windowDays: number): Promise<FeltTogetherRate> {
    const { rows } = await this.db().query<{
      yes_count: string;
      total_responded: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE sentiment = 'yes') AS yes_count,
         COUNT(*) FILTER (WHERE sentiment IN ('yes', 'no'))  AS total_responded
       FROM felt_together_responses
       WHERE created_at >= now() - ($1 || ' days')::INTERVAL`,
      [windowDays],
    );
    const r = rows[0] ?? { yes_count: '0', total_responded: '0' };
    const yesCount = parseInt(r.yes_count, 10);
    const totalResponded = parseInt(r.total_responded, 10);
    const rate = totalResponded > 0 ? yesCount / totalResponded : 0;
    return { rate, yesCount, totalResponded, windowDays };
  }
}
