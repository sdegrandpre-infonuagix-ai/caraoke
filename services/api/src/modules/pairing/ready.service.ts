import { AppError } from '@caraoke/shared';
import type { EventPublisher } from '../../events/index.js';
import type { SessionRepository } from './pairing.repository.js';
import { decideReady, toReadyState, type ReadyState } from './ready.logic.js';

/**
 * Ready-handshake orchestration (FR10). Marks a participant ready; when both are ready the
 * SessionStateMachine transitions pairing → ready (UX-DR2) and a `partner.ready` event is
 * published over AppSync Events so both clients are confirmed before any countdown.
 */
export class SessionReadyService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly events: EventPublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async markReady(sessionId: string, userId: string): Promise<ReadyState> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found.');

    const decision = decideReady(session, userId);

    await this.sessions.setReady(sessionId, decision.role, true);
    if (decision.transitioned) {
      await this.sessions.updateStatus(sessionId, decision.nextStatus);
    }

    const state = toReadyState(sessionId, decision);

    // Confirm readiness to both partners via AppSync Events before any countdown.
    if (decision.transitioned) {
      await this.events.publish({
        type: 'partner.ready',
        version: 1,
        sessionId,
        occurredAt: this.now().toISOString(),
        data: state,
      });
    }

    return state;
  }

  async getReadyState(sessionId: string): Promise<ReadyState> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found.');
    return {
      sessionId,
      status: session.status,
      hostReady: session.hostReady,
      guestReady: session.guestReady,
      bothReady: session.hostReady && session.guestReady && session.guestUserId != null,
    };
  }
}
