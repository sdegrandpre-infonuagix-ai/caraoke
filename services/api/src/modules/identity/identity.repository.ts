import type { Pool } from 'pg';
import { rowToCamel } from '../../db/mapping.js';
import { getPool } from '../../db/pool.js';
import type { AuthClaims, User } from './identity.types.js';

/** Data access for users. The repository is the only code touching SQL (architecture). */
export interface UserRepository {
  findByCognitoSub(cognitoSub: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(claims: AuthClaims): Promise<User>;
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
}
