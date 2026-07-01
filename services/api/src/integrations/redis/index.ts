import type { Env } from '../../config/env.js';
import { LiveRedisStore } from './live.js';
import { MockRedisStore } from './mock.js';

export interface RedisStore {
  setex(key: string, ttlSeconds: number, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  /** Scan keys matching a pattern (use sparingly; bounded result set only). */
  scan(pattern: string): Promise<string[]>;
}

export function getRedisStore(env: Env): RedisStore {
  return env.CARAOKE_INTEGRATIONS === 'live' && env.REDIS_URL
    ? new LiveRedisStore(env.REDIS_URL)
    : new MockRedisStore();
}
