import { Pool } from 'pg';
import { loadEnv } from '../config/env.js';
import { getDbPassword, invalidateDbPassword } from './dbSecret.js';

let pool: Pool | null = null;

/**
 * Lazily-created shared pg Pool (architecture: Data boundary — repositories are the only
 * code touching SQL). Throws if DATABASE_URL is unset when a DB query is first needed.
 */
export function getPool(): Pool {
  if (pool) return pool;
  const env = loadEnv();
  // Aurora enforces TLS (rds.force_ssl=1). Enable SSL in production; rejectUnauthorized:false
  // trusts the in-VPC RDS endpoint without bundling the RDS CA (fine for dev — harden later).
  const ssl = env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined;

  // Prefer discrete DB_* parts: DB_USER + host/name come from env, and the password comes from a
  // provider function so it self-heals when RDS rotates the managed master secret (pg invokes the
  // provider per new connection; see getDbPassword). DB_PASSWORD alone (no ARN) still works.
  if (env.DB_HOST && env.DB_USER && (env.DB_SECRET_ARN || env.DB_PASSWORD)) {
    pool = new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: () => getDbPassword(),
      database: env.DB_NAME ?? 'caraoke',
      max: 10,
      ssl,
    });
    // A bad-password error on an idle client means the secret rotated under us — drop the cache so
    // the next connection re-fetches the fresh password (the pool then recovers on its own).
    pool.on('error', (err: Error & { code?: string }) => {
      if (err.code === '28P01') invalidateDbPassword();
    });
    return pool;
  }
  // Fallback: full connection string (local dev / legacy).
  if (env.DATABASE_URL) {
    pool = new Pool({ connectionString: env.DATABASE_URL, max: 10, ssl });
    return pool;
  }
  throw new Error(
    'No database configuration — set DB_HOST/DB_USER/DB_PASSWORD or DATABASE_URL (a DB-backed route was called).',
  );
}

/** Override the pool (tests). */
export function setPool(p: Pool | null): void {
  pool = p;
}
