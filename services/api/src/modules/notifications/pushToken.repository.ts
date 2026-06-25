import type { Pool } from 'pg';
import { getPool } from '../../db/pool.js';

export interface PushTokenRow {
  token: string;
  platform: string;
}

export interface PushTokenRepository {
  upsert(userId: string, token: string, platform: string): Promise<void>;
  listForUser(userId: string): Promise<PushTokenRow[]>;
}

export class PgPushTokenRepository implements PushTokenRepository {
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async upsert(userId: string, token: string, platform: string): Promise<void> {
    // A token re-registering under a new user moves to that user (device handed over / re-login).
    await this.db().query(
      `INSERT INTO push_tokens (token, user_id, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         updated_at = now()`,
      [token, userId, platform],
    );
  }

  async listForUser(userId: string): Promise<PushTokenRow[]> {
    const { rows } = await this.db().query(
      'SELECT token, platform FROM push_tokens WHERE user_id = $1',
      [userId],
    );
    return rows as PushTokenRow[];
  }
}
