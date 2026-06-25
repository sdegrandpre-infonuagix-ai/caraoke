import type { Pool } from 'pg';
import { rowToCamel } from '../../db/mapping.js';
import { getPool } from '../../db/pool.js';
import type { AuthClaims, User } from './identity.types.js';

/** Patch of editable user columns (camelCase). Undefined fields are left unchanged. */
export interface UserUpdate {
  displayName?: string | null;
}

/** Data access for users. The repository is the only code touching SQL (architecture). */
export interface UserRepository {
  findByCognitoSub(cognitoSub: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(claims: AuthClaims): Promise<User>;
  update(id: string, patch: UserUpdate): Promise<User | null>;
  /** Delete the user; FK ON DELETE CASCADE removes all associated personal data (FR6). */
  deleteById(id: string): Promise<boolean>;
}

export class PgUserRepository implements UserRepository {
  // Pool is resolved lazily so the app can be constructed without a DB (mock/test mode).
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async findByCognitoSub(cognitoSub: string): Promise<User | null> {
    const { rows } = await this.db().query(
      'SELECT * FROM users WHERE cognito_sub = $1',
      [cognitoSub],
    );
    return rows[0] ? rowToCamel<User>(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db().query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? rowToCamel<User>(rows[0]) : null;
  }

  async create(claims: AuthClaims): Promise<User> {
    const { rows } = await this.db().query(
      `INSERT INTO users (cognito_sub, email, display_name, auth_provider)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [claims.cognitoSub, claims.email, claims.displayName ?? null, claims.authProvider],
    );
    return rowToCamel<User>(rows[0]!);
  }

  async update(id: string, patch: UserUpdate): Promise<User | null> {
    // Only displayName is editable today; the validated patch always carries it (may be
    // null to clear). Bump updated_at on every change.
    const { rows } = await this.db().query(
      `UPDATE users
         SET display_name = $2,
             updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, patch.displayName ?? null],
    );
    return rows[0] ? rowToCamel<User>(rows[0]) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    const { rowCount } = await this.db().query('DELETE FROM users WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }
}
