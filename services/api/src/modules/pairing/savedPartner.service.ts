import { AppError } from '@caraoke/shared';
import type { SavedPartnerRepository } from './savedPartner.repository.js';
import type { SavedPartnerView } from './savedPartner.types.js';
import type { SessionConnection } from './pairing.types.js';
import { NoopNotifier, type Notifier } from '../notifications/notifier.js';

/** The subset of PairingService the re-pair path needs. */
export interface PairedSessionFactory {
  createSessionWith(hostUserId: string, guestUserId: string): Promise<SessionConnection>;
}

/**
 * Saved partners + fast re-pair (FR9). Saving links the two users; re-pairing creates a
 * session with the partner pre-assigned so the path from intent to a connected session is a
 * single request (well within the ≤10s target).
 */
export class SavedPartnerService {
  constructor(
    private readonly repo: SavedPartnerRepository,
    private readonly pairing: PairedSessionFactory,
    private readonly notifier: Notifier = new NoopNotifier(),
  ) {}

  async save(userId: string, partnerUserId: string): Promise<void> {
    if (userId === partnerUserId) {
      throw new AppError('VALIDATION_FAILED', 'You cannot save yourself as a partner.');
    }
    await this.repo.save(userId, partnerUserId);
  }

  async list(userId: string): Promise<SavedPartnerView[]> {
    return this.repo.list(userId);
  }

  async remove(userId: string, partnerUserId: string): Promise<void> {
    await this.repo.remove(userId, partnerUserId);
  }

  /** Fast re-pair: only with someone the user has saved. */
  async repair(userId: string, partnerUserId: string): Promise<SessionConnection> {
    if (!(await this.repo.exists(userId, partnerUserId))) {
      throw new AppError('NOT_FOUND', 'That partner is not in your saved list.');
    }
    const connection = await this.pairing.createSessionWith(userId, partnerUserId);
    // Tell the saved partner they've been invited (deep-linked, localized) — best-effort.
    await this.notifier.notify(partnerUserId, 'invite', { sessionId: connection.session.id });
    return connection;
  }
}
