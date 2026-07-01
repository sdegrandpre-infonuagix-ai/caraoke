import { AppError } from '@caraoke/shared';
import type { ModerationRepository, ReportRow } from './moderation.repository.js';

// After this many reports against a user, their reports are escalated for urgent review (FR37).
const ESCALATION_THRESHOLD = 3;

export class ModerationService {
  constructor(private readonly repo: ModerationRepository) {}

  async block(fromUserId: string, toUserId: string): Promise<void> {
    if (fromUserId === toUserId) {
      throw new AppError('VALIDATION_FAILED', 'You cannot block yourself.');
    }
    await this.repo.saveBlock(fromUserId, toUserId);
  }

  /** Bidirectional — returns true if either party has blocked the other. */
  async isBlocked(userA: string, userB: string): Promise<boolean> {
    return this.repo.isBlocked(userA, userB);
  }

  /**
   * File a report and automatically escalate if the reported user has reached the
   * repeat-offender threshold (FR37). Escalation flags all pending reports against
   * them for urgent operator review.
   */
  async report(
    reporterId: string,
    reportedId: string,
    sessionId: string | null,
    reason: string | null,
  ): Promise<{ escalated: boolean }> {
    if (reporterId === reportedId) {
      throw new AppError('VALIDATION_FAILED', 'You cannot report yourself.');
    }
    await this.repo.saveReport(reporterId, reportedId, sessionId, reason);

    const count = await this.repo.countReportsAgainst(reportedId);
    if (count >= ESCALATION_THRESHOLD) {
      await this.repo.escalateReportsAgainst(reportedId);
      return { escalated: true };
    }
    return { escalated: false };
  }

  /** Operator review queue — pending and escalated reports, escalated first (FR37). */
  async getReviewQueue(limit?: number): Promise<ReportRow[]> {
    return this.repo.listUnresolved(limit);
  }

  /** Record an operator resolution and mark the report resolved (audit trail). */
  async resolveReport(reportId: string, note: string | null): Promise<void> {
    await this.repo.resolveReport(reportId, note);
  }
}
