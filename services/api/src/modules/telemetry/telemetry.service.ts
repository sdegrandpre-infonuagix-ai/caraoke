import type { FirehoseClient } from '../../integrations/firehose/index.js';
import type { TelemetryRepository, FeltTogetherRate } from './telemetry.repository.js';

const STREAM_NAME = 'caraoke-session-health';

const PROHIBITED_KEYS = ['email', 'name', 'phone', 'lat', 'lng', 'location', 'voice', 'audio'];

/**
 * Strip any prohibited keys from a telemetry payload (NFR6/8/9).
 * Belt-and-suspenders server-side guard — the client should already have scrubbed these.
 */
function scrub(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!PROHIBITED_KEYS.includes(k.toLowerCase())) {
      result[k] = v;
    }
  }
  return result;
}

export class TelemetryService {
  constructor(
    private readonly firehose: FirehoseClient,
    private readonly repo?: TelemetryRepository,
  ) {}

  /** Emit a session-health event to Firehose → S3 → Athena (FR43, AR7). */
  async emit(event: Record<string, unknown>): Promise<void> {
    const clean = scrub(event);
    await this.firehose.putRecord(STREAM_NAME, clean);
  }

  /** Persist a felt-together response (FR42 capture). Sentiment only — no voice/audio. */
  async recordFeltTogether(
    userId: string,
    sessionId: string,
    sentiment: string,
  ): Promise<void> {
    await this.repo?.saveFeltTogether(userId, sessionId, sentiment, new Date());
  }

  /** Aggregate the felt-together rate over the last N days (FR42 aggregation). */
  async getFeltTogetherRate(windowDays: number): Promise<FeltTogetherRate> {
    if (!this.repo) return { rate: 0, yesCount: 0, totalResponded: 0, windowDays };
    return this.repo.getFeltTogetherRate(windowDays);
  }
}
