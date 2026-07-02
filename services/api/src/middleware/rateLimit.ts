import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { loadEnv } from '../config/env.js';

// Rate limiting is disabled under test so the suite (which fires many requests from one IP)
// isn't throttled. It's a coarse per-IP defense against brute force / abuse of the expensive
// or security-sensitive endpoints — not a substitute for per-user quotas.
const skipInTest = (): boolean => loadEnv().NODE_ENV === 'test';

/** Money + identity mutations (billing subscribe/setup-intent, age-verification session). */
export function sensitiveLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: skipInTest,
    message: { error: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  });
}

/** Admin-key routes — slows brute-forcing of the operator key even before the key check runs. */
export function adminLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: skipInTest,
    message: { error: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  });
}
