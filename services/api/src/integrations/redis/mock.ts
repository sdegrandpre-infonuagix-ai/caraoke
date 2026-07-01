import type { RedisStore } from './index.js';

interface Entry { value: string; expiresAt: number }

/** In-memory Redis mock for tests and local dev. TTLs honoured via timestamp comparison. */
export class MockRedisStore implements RedisStore {
  private store = new Map<string, Entry>();

  setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return Promise.resolve(null);
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return Promise.resolve(null); }
    return Promise.resolve(entry.value);
  }

  del(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  scan(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const now = Date.now();
    const alive: string[] = [];
    for (const [key, entry] of this.store) {
      if (now <= entry.expiresAt && regex.test(key)) alive.push(key);
    }
    return Promise.resolve(alive);
  }
}
