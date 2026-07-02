import type { RedisStore } from '../../integrations/redis/index.js';
import type { LocationEntry } from './discovery.types.js';

/** Decoupled block check so discovery doesn't import the moderation module directly. */
export interface BlockChecker {
  isBlocked(userA: string, userB: string): Promise<boolean>;
}

// Each Redis key holds the user's coarse Plus Code for 5 min (FR29, NFR9).
// The mobile re-publishes every 4 min, so live entries stay fresh; stopping the
// app causes the key to expire naturally — no persistent location trail.
const LOCATION_TTL_SECONDS = 5 * 60;

function locationKey(userId: string): string {
  return `discovery:location:${userId}`;
}

export class DiscoveryService {
  constructor(
    private readonly redis: RedisStore,
    /** Optional block enforcement — injected by app.ts after the moderation module is wired. */
    private readonly blockChecker?: BlockChecker,
  ) {}

  async publishLocation(userId: string, displayName: string, plusCode: string): Promise<void> {
    const entry: LocationEntry = { userId, displayName, plusCode };
    await this.redis.setex(locationKey(userId), LOCATION_TTL_SECONDS, JSON.stringify(entry));
  }

  async revokeLocation(userId: string): Promise<void> {
    await this.redis.del(locationKey(userId));
  }

  /** Current live location entry for a user, or null if they aren't broadcasting. */
  async getLocation(userId: string): Promise<LocationEntry | null> {
    const raw = await this.redis.get(locationKey(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocationEntry;
    } catch {
      return null;
    }
  }

  async getNearby(plusCode: string, excludeUserId: string): Promise<LocationEntry[]> {
    const keys = await this.redis.scan('discovery:location:*');
    const candidates: LocationEntry[] = [];

    await Promise.all(
      keys.map(async (key) => {
        const raw = await this.redis.get(key);
        if (!raw) return;
        try {
          const entry: LocationEntry = JSON.parse(raw) as LocationEntry;
          if (entry.userId !== excludeUserId && entry.plusCode === plusCode) {
            candidates.push(entry);
          }
        } catch {
          // Malformed entry — ignore
        }
      }),
    );

    // Hide anyone the caller has blocked or been blocked by (FR33) — a blocked user must not
    // resurface as a discoverable nearby singer.
    if (!this.blockChecker) return candidates;
    const checker = this.blockChecker;
    const verdicts = await Promise.all(
      candidates.map((entry) => checker.isBlocked(excludeUserId, entry.userId)),
    );
    return candidates.filter((_, i) => !verdicts[i]);
  }
}
