import type { ResolvedTrack } from './agent.types.js';

/**
 * Coordinates the "both tap Start singing" gate that sits in front of a synchronized playback
 * start. The host picks a song (a *proposal*); the synchronized start is only scheduled once
 * every participant has confirmed — so the host can never start singing alone.
 *
 * State is in-memory (the API runs a single task; a restart just drops an in-flight proposal,
 * and the host re-picks). Proposals expire so a stale, never-confirmed pick can't linger.
 */

interface Proposal {
  track: ResolvedTrack;
  participantIds: string[];
  confirmed: Set<string>;
  /** Set once the start has been scheduled, so a racing second confirm can't schedule twice. */
  scheduled: boolean;
  expiresAt: number;
}

export type ConfirmOutcome =
  | { status: 'no_proposal' }
  | {
      status: 'waiting' | 'ready';
      track: ResolvedTrack;
      participantIds: string[];
      confirmedCount: number;
      participantCount: number;
    };

export class StartCoordinator {
  private readonly proposals = new Map<string, Proposal>();

  constructor(private readonly ttlMs: number = 120_000) {}

  /** Record the host's song pick, resetting any prior confirmations for the session. */
  propose(sessionId: string, participantIds: string[], track: ResolvedTrack): void {
    this.proposals.set(sessionId, {
      track,
      participantIds,
      confirmed: new Set(),
      scheduled: false,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Record a participant's "Start singing" confirmation. Returns `ready` exactly once — when the
   * last participant confirms — so the caller schedules the start a single time; otherwise
   * `waiting`, or `no_proposal` if there's nothing to start (expired / already scheduled / none).
   */
  confirm(sessionId: string, userId: string): ConfirmOutcome {
    const p = this.proposals.get(sessionId);
    if (!p || p.scheduled || p.expiresAt < Date.now()) {
      if (p && p.expiresAt < Date.now()) this.proposals.delete(sessionId);
      return { status: 'no_proposal' };
    }

    if (p.participantIds.includes(userId)) p.confirmed.add(userId);
    const participantCount = p.participantIds.length;
    const confirmedCount = p.participantIds.filter((id) => p.confirmed.has(id)).length;
    const allConfirmed = participantCount > 0 && confirmedCount === participantCount;

    if (allConfirmed) {
      p.scheduled = true; // atomic guard against a double-schedule from concurrent confirms
      return { status: 'ready', track: p.track, participantIds: p.participantIds, confirmedCount, participantCount };
    }
    return { status: 'waiting', track: p.track, participantIds: p.participantIds, confirmedCount, participantCount };
  }

  /** Drop a session's proposal (after scheduling, or on session end). */
  clear(sessionId: string): void {
    this.proposals.delete(sessionId);
  }
}
