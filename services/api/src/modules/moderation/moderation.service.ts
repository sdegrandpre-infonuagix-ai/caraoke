import { AppError } from '@caraoke/shared';
import type { ModerationRepository } from './moderation.repository.js';

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

  async report(
    reporterId: string,
    reportedId: string,
    sessionId: string | null,
    reason: string | null,
  ): Promise<void> {
    if (reporterId === reportedId) {
      throw new AppError('VALIDATION_FAILED', 'You cannot report yourself.');
    }
    await this.repo.saveReport(reporterId, reportedId, sessionId, reason);
  }
}
