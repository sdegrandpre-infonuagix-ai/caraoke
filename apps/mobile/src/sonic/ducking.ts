// AudioDucking pure logic (Story 4.2, UX-DR10). When a higher-priority sound plays, lower the
// others and restore them smoothly. No native calls here so the levels/curves are unit-testable;
// the AudioDucking service applies these via the native bridge.

export type SoundLayer = 'riff' | 'partner' | 'backing' | 'ambient';

/**
 * Priority stack (index 0 = highest). The Voice Agent (Riff) is the most important sound — it
 * must always be intelligible — then the partner's live voice, then the backing track, then
 * ambient presence.
 */
export const PRIORITY: readonly SoundLayer[] = ['riff', 'partner', 'backing', 'ambient'];

export interface DuckConfig {
  /** Backing track is lowered ~12dB when the agent speaks. */
  backingDb: number;
  /** Partner voice is lowered ~6dB when the agent speaks. */
  partnerDb: number;
  /** Ambient presence ducks with the backing track. */
  ambientDb: number;
  /** Restore ramp duration (ms). */
  restoreMs: number;
}

export const DEFAULT_DUCK: DuckConfig = {
  backingDb: -12,
  partnerDb: -6,
  ambientDb: -12,
  restoreMs: 500,
};

/** Higher-priority of two layers (the one that wins the stack, UX-DR10). */
export function higherPriority(a: SoundLayer, b: SoundLayer): SoundLayer {
  return PRIORITY.indexOf(a) <= PRIORITY.indexOf(b) ? a : b;
}

/**
 * Target gains (dB) for each layer. When the agent (Riff) is speaking, the lower-priority
 * layers duck by their configured amounts; otherwise everything is at unity (0dB).
 */
export function duckGains(riffActive: boolean, cfg: DuckConfig = DEFAULT_DUCK): Record<SoundLayer, number> {
  if (!riffActive) return { riff: 0, partner: 0, backing: 0, ambient: 0 };
  return { riff: 0, partner: cfg.partnerDb, backing: cfg.backingDb, ambient: cfg.ambientDb };
}

/**
 * Linear gain ramp (dB) used to restore a layer over `durationMs` — e.g. unducking the backing
 * track back to 0dB over 500ms. Clamped to the [from, to] endpoints.
 */
export function rampGainDb(
  fromDb: number,
  toDb: number,
  elapsedMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return toDb;
  if (elapsedMs <= 0) return fromDb;
  return fromDb + (toDb - fromDb) * (elapsedMs / durationMs);
}
