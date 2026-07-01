import type { Pool } from 'pg';
import { rowToCamel } from '../../db/mapping.js';
import { getPool } from '../../db/pool.js';
import type { SavedPartnerView } from './savedPartner.types.js';

export interface SavedPartnerRepository {
  /** Idempotently link user → partner. */
  save(userId: string, partnerUserId: string): Promise<void>;
  exists(userId: string, partnerUserId: string): Promise<boolean>;
  list(userId: string): Promise<SavedPartnerView[]>;
  remove(userId: string, partnerUserId: string): Promise<boolean>;
}

export class PgSavedPartnerRepository implements SavedPartnerRepository {
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async save(userId: string, partnerUserId: string): Promise<void> {
    await this.db().query(
      `INSERT INTO saved_partners (user_id, partner_user_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, partner_user_id) DO NOTHING`,
      [userId, partnerUserId],
    );
  }

  async exists(userId: string, partnerUserId: string): Promise<boolean> {
    const { rows } = await this.db().query(
      'SELECT 1 FROM saved_partners WHERE user_id = $1 AND partner_user_id = $2',
      [userId, partnerUserId],
    );
    return rows.length > 0;
  }

  async list(userId: string): Promise<SavedPartnerView[]> {
    const { rows } = await this.db().query(
      `SELECT sp.partner_user_id, u.display_name, u.language_pref, sp.created_at AS saved_at
         FROM saved_partners sp
         JOIN users u ON u.id = sp.partner_user_id
        WHERE sp.user_id = $1
        ORDER BY sp.created_at DESC`,
      [userId],
    );
    return rows.map((r) => rowToCamel<SavedPartnerView>(r));
  }

  async remove(userId: string, partnerUserId: string): Promise<boolean> {
    const { rowCount } = await this.db().query(
      'DELETE FROM saved_partners WHERE user_id = $1 AND partner_user_id = $2',
      [userId, partnerUserId],
    );
    return (rowCount ?? 0) > 0;
  }
}
