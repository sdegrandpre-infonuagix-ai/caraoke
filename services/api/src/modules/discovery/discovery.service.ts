import type { RedisStore } from '../../integrations/redis/index.js';
import type { LocationEntry } from './discovery.types.js';

// Each Redis key holds the user's coarse Plus Code for 5 min (FR29, NFR9).
// The mobile re-publishes every 4 min, so live entries stay fresh; stopping the
// app causes the key to expire naturally — no persistent location trail.
const LOCATION_TTL_SECONDS = 5 * 60;

function locationKey(userId: string): string {
  return `discovery:location:${userId}`;
}

export class DiscoveryService {
  constructor(private readonly redis: RedisStore) {}

  async publishLocation(userId: string, displayName: string, plusCode: string): Promise<void> {
    const entry: LocationEntry = { userId, displayName, plusCode };
    await this.redis.setex(locationKey(userId), LOCATION_TTL_SECONDS, JSON.stringify(entry));
  }

  async revokeLocation(userId: string): Promise<void> {
    await this.redis.del(locationKey(userId));
  }

  async getNearby(plusCode: string, excludeUserId: string): Promise<LocationEntry[]> {
    const keys = await this.redis.scan('discovery:location:*');
    const results: LocationEntry[] = [];

    await Promise.all(
      keys.map(async (key) => {
        const raw = await this.redis.get(key);
        if (!raw) return;
        try {
          const entry: LocationEntry = JSON.parse(raw) as LocationEntry;
          if (entry.userId !== excludeUserId && entry.plusCode === plusCode) {
            results.push(entry);
          }
        } catch {
          // Malformed entry — ignore
        }
      }),
    );

    return results;
  }
}
