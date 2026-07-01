import Redis from 'ioredis';
import type { RedisStore } from './index.js';

export class LiveRedisStore implements RedisStore {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
  }

  setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    return this.client.setex(key, ttlSeconds, value).then(() => undefined);
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  del(key: string): Promise<void> {
    return this.client.del(key).then(() => undefined);
  }

  async scan(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }
}
