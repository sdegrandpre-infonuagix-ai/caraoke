// Client clock-sync primitive (Story 3.6, AR10/NFR1). Samples the server's time over several
// round-trips, derives a server-time offset, refreshes it periodically, and exposes
// serverNow()/msUntil() to the playback layer for scheduling a ≤200ms simultaneous start.

import { bestSampleOffsetMs, msUntil as sharedMsUntil, type ClockSample } from '@caraoke/shared';
import { fetchServerTime } from '../api/time';

const SAMPLE_COUNT = 5;
const REFRESH_MS = 60_000;

class ClockSync {
  private offsetMs = 0;
  private lastSyncedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Run the ping/pong exchange and update the offset from the best (lowest-RTT) sample. */
  async sync(samples = SAMPLE_COUNT): Promise<number> {
    const collected: ClockSample[] = [];
    for (let i = 0; i < samples; i++) {
      const t0 = Date.now();
      try {
        const { serverTime } = await fetchServerTime();
        const t1 = Date.now();
        collected.push({ t0, serverTime, t1 });
      } catch {
        // Skip a failed probe; a later sample (or refresh) will recover.
      }
    }
    if (collected.length > 0) {
      this.offsetMs = bestSampleOffsetMs(collected);
      this.lastSyncedAt = Date.now();
    }
    return this.offsetMs;
  }

  /** Begin periodic refresh (idempotent). Returns immediately after kicking off the first sync. */
  start(): void {
    if (this.timer) return;
    void this.sync();
    this.timer = setInterval(() => void this.sync(), REFRESH_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Current server-time offset (ms) to add to the local clock. */
  getOffsetMs(): number {
    return this.offsetMs;
  }

  /** Best estimate of the server's current time. */
  serverNow(): number {
    return Date.now() + this.offsetMs;
  }

  /** Local milliseconds to wait until an absolute server-time epoch (clamped at 0). */
  msUntil(targetServerEpoch: number): number {
    return sharedMsUntil(targetServerEpoch, Date.now(), this.offsetMs);
  }

  /** Whether a sync has ever completed. */
  isSynced(): boolean {
    return this.lastSyncedAt > 0;
  }
}

/** Singleton clock-sync exposed to the playback layer. */
export const clockSync = new ClockSync();
