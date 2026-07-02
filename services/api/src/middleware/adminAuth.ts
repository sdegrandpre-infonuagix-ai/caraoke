import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Constant-time comparison of the presented admin key against the configured one.
 * A plain `!==` leaks key length and matching-prefix length via response timing; a
 * timing-safe compare closes that side channel. Length is checked first because
 * timingSafeEqual throws on unequal-length buffers (the length check itself leaks only
 * the key's length, which is not secret-shaped).
 */
function keyMatches(presented: string | undefined, configured: string): boolean {
  if (typeof presented !== 'string') return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Shared operator-admin guard for the `/admin/*` routes (moderation, billing, identity,
 * telemetry). Reads ADMIN_API_KEY at request time so the key can be rotated without a
 * restart. Denies when the key is unset (fail-closed) or does not match.
 *
 * Returns the raw `{ error, message }` 403 shape the individual routers used before this
 * was consolidated, so existing clients and dashboards see no change.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = process.env['ADMIN_API_KEY'];
  if (!key || !keyMatches(req.headers['x-admin-key'] as string | undefined, key)) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Admin key required.' });
    return;
  }
  next();
}
