// ⚠️ THROWAWAY — Phase 0 measurement (Story 1.4). Data model for drift/latency samples,
// the felt-together answer, and the go/no-go report. Pure types — no I/O.

/** NFR thresholds the Phase 0 run is judged against. */
export const NFR2_DRIFT_MAX_MS = 50; // backing-track drift, sustained across a song
export const NFR3_VOICE_LATENCY_MAX_MS = 150; // one-way live-voice latency

/**
 * One drift sample from a single phone: its Spotify playback position vs the wall-clock
 * elapsed since the shared simultaneous start. `errorMs = position - expectedPosition`.
 * Inter-device drift is the difference between the two phones' errors at the same instant.
 */
export interface DriftSample {
  /** Phone role that produced the sample. */
  role: 'operator' | 'partner';
  /** Coordinator-time instant the sample was taken (ms epoch). */
  at: number;
  /** Spotify reported playback position (ms). */
  positionMs: number;
  /** Expected position = at - startAt (ms). */
  expectedMs: number;
  /** positionMs - expectedMs (signed). */
  errorMs: number;
}

/** One voice round-trip sample over the peer data channel (proxy for the voice path). */
export interface LatencySample {
  /** Round-trip time in ms. One-way ≈ rtt / 2. */
  rttMs: number;
}

/** The spoken post-session answer (FR16/FR42 precursor). */
export interface FeltTogether {
  /** Operator's yes/no read of the spoken answer. */
  felt: boolean;
  /** Free-text transcription of what was said. */
  transcript?: string;
  /** Optional path to the saved audio clip under results/. */
  audioPath?: string;
}

/** Everything captured for one Phase 0 session. */
export interface SessionLog {
  sessionId: string;
  trackUri: string;
  startAt: number;
  driftSamples: DriftSample[];
  latencySamples: LatencySample[];
  feltTogether?: FeltTogether;
}

export interface Stat {
  count: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
}

export interface GoNoGoReport {
  sessionId: string;
  drift: Stat;
  voiceLatencyOneWay: Stat;
  driftWithinNfr2: boolean;
  latencyWithinNfr3: boolean;
  feltTogether?: FeltTogether;
  /** 'go' | 'no-go' | 'inconclusive'. */
  recommendation: 'go' | 'no-go' | 'inconclusive';
  rationale: string;
}
