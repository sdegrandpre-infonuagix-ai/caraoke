import { AppError } from '@caraoke/shared';
import type { CreateSessionInput, SessionRepository } from './pairing.repository.js';
import { PG_UNIQUE_VIOLATION } from './pairing.repository.js';
import { generatePairingCode, generateInviteToken, buildInviteUrl } from './pairing.codes.js';
import { toPublicSession, type CreateSessionResult } from './pairing.types.js';

export interface PairingServiceOptions {
  inviteBaseUrl: string;
  ttlMinutes: number;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

/**
 * Session creation + invite generation (FR7). Produces a `sessions` record with a unique
 * pairing code and single-use invite token that expires after a defined window. On the
 * astronomically rare code/token collision, regenerates and retries.
 */
export class PairingService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly opts: PairingServiceOptions,
  ) {}

  async createSession(hostUserId: string): Promise<CreateSessionResult> {
    const now = this.opts.now?.() ?? new Date();
    const expiresAt = new Date(now.getTime() + this.opts.ttlMinutes * 60_000);

    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const input: CreateSessionInput = {
        hostUserId,
        status: 'pairing',
        pairingCode: generatePairingCode(),
        inviteToken: generateInviteToken(),
        expiresAt,
      };
      try {
        const session = await this.sessions.create(input);
        return {
          session: toPublicSession(session),
          invite: {
            pairingCode: session.pairingCode,
            inviteUrl: buildInviteUrl(this.opts.inviteBaseUrl, session.inviteToken),
            expiresAt: session.expiresAt,
          },
        };
      } catch (err) {
        if (isUniqueViolation(err) && attempt < maxAttempts) continue;
        throw err;
      }
    }
    // Unreachable in practice; satisfies the type checker.
    throw new AppError('CONFLICT', 'Could not allocate a unique invite. Please retry.');
  }
}
