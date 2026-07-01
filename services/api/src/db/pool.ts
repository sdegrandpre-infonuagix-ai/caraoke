import { Pool } from 'pg';
import { loadEnv } from '../config/env.js';

let pool: Pool | null = null;

/**
 * Lazily-created shared pg Pool (architecture: Data boundary — repositories are the only
 * code touching SQL). Throws if DATABASE_URL is unset when a DB query is first needed.
 */
export function getPool(): Pool {
  if (pool) return pool;
  const { DATABASE_URL } = loadEnv();
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — a database-backed route was called.');
  }
  pool = new Pool({ connectionString: DATABASE_URL, max: 10 });
  return pool;
}

/** Override the pool (tests). */
export function setPool(p: Pool | null): void {
  pool = p;
}
