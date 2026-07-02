import type { Pool } from 'pg';
import { rowToCamel } from '../../db/mapping.js';
import { getPool } from '../../db/pool.js';
import type { SpotifyLink } from './spotify.types.js';

export interface SpotifyLinkUpsert {
  userId: string;
  spotifyUserId: string;
  product: string;
  isPremium: boolean;
  displayName: string | null;
  refreshToken: string | null;
}

export interface SpotifyLinkRepository {
  findByUserId(userId: string): Promise<SpotifyLink | null>;
  /** Returns the stored OAuth refresh token, or null when none was saved or the user is not linked. */
  findRefreshToken(userId: string): Promise<string | null>;
  upsert(input: SpotifyLinkUpsert): Promise<SpotifyLink>;
}

export class PgSpotifyLinkRepository implements SpotifyLinkRepository {
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async findByUserId(userId: string): Promise<SpotifyLink | null> {
    const { rows } = await this.db().query(
      `SELECT user_id, spotify_user_id, product, is_premium, display_name, linked_at, updated_at
         FROM spotify_accounts WHERE user_id = $1`,
      [userId],
    );
    return rows[0] ? rowToCamel<SpotifyLink>(rows[0]) : null;
  }

  async findRefreshToken(userId: string): Promise<string | null> {
    const { rows } = await this.db().query(
      `SELECT refresh_token FROM spotify_accounts WHERE user_id = $1`,
      [userId],
    );
    return (rows[0]?.refresh_token as string | undefined) ?? null;
  }

  async upsert(input: SpotifyLinkUpsert): Promise<SpotifyLink> {
    // Re-linking updates the row in place (one Spotify link per user).
    const { rows } = await this.db().query(
      `INSERT INTO spotify_accounts
         (user_id, spotify_user_id, product, is_premium, display_name, refresh_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         spotify_user_id = EXCLUDED.spotify_user_id,
         product = EXCLUDED.product,
         is_premium = EXCLUDED.is_premium,
         display_name = EXCLUDED.display_name,
         refresh_token = COALESCE(EXCLUDED.refresh_token, spotify_accounts.refresh_token),
         updated_at = now()
       RETURNING user_id, spotify_user_id, product, is_premium, display_name, linked_at, updated_at`,
      [
        input.userId,
        input.spotifyUserId,
        input.product,
        input.isPremium,
        input.displayName,
        input.refreshToken,
      ],
    );
    return rowToCamel<SpotifyLink>(rows[0]!);
  }
}
