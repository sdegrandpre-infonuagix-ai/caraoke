import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { loadEnv } from '../config/env.js';

/**
 * Runtime DB-password provider (self-healing across RDS rotation).
 *
 * RDS periodically rotates the Aurora master password in its managed secret. ECS injects the
 * password into the container ONLY at start, so a running task goes stale after a rotation and
 * every new connection fails with 28P01 until someone redeploys. Instead, when DB_SECRET_ARN is
 * set we fetch the current password from the managed secret on demand (pg calls this per new
 * connection) with a short cache. After a rotation the cache expires (or is invalidated on the
 * first auth failure) and new connections pick up the fresh password within ~a minute — no redeploy.
 *
 * Falls back to the start-time DB_PASSWORD env if the secret can't be read (e.g. before the IAM
 * grant has propagated), so the transition is safe.
 */

const CACHE_TTL_MS = 60_000;

let client: SecretsManagerClient | null = null;
let cache: { password: string; fetchedAt: number } | null = null;

function sm(): SecretsManagerClient {
  if (!client) client = new SecretsManagerClient({ region: loadEnv().AWS_REGION });
  return client;
}

/** Drop the cached password so the next fetch re-reads the secret (call on an auth failure). */
export function invalidateDbPassword(): void {
  cache = null;
}

/** Current DB password: from the managed secret when DB_SECRET_ARN is set, else DB_PASSWORD. */
export async function getDbPassword(): Promise<string> {
  const env = loadEnv();
  if (!env.DB_SECRET_ARN) return env.DB_PASSWORD ?? '';

  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.password;

  try {
    const res = await sm().send(new GetSecretValueCommand({ SecretId: env.DB_SECRET_ARN }));
    const parsed = JSON.parse(res.SecretString ?? '{}') as { password?: string };
    if (parsed.password) {
      cache = { password: parsed.password, fetchedAt: now };
      return parsed.password;
    }
  } catch {
    // Fall through to the env fallback / last-known password below.
  }
  return env.DB_PASSWORD ?? cache?.password ?? '';
}
