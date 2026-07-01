import { AppError } from '@caraoke/shared';
import type { UserRepository, UserUpdate } from './identity.repository.js';
import type { UserDirectory } from './userDirectory.js';
import { NoopUserDirectory } from './userDirectory.js';
import type { AuthClaims, User } from './identity.types.js';

/**
 * Identity domain logic. `findOrCreate` realizes FR1: the first authenticated call after a
 * federated sign-in creates the users record; returning sign-ins reuse the existing account
 * (looked up by the stable Cognito subject). Profile edits and account deletion (FR1/FR6)
 * also live here.
 */
export class IdentityService {
  constructor(
    private readonly users: UserRepository,
    private readonly directory: UserDirectory = new NoopUserDirectory(),
  ) {}

  async findOrCreate(claims: AuthClaims): Promise<User> {
    const existing = await this.users.findByCognitoSub(claims.cognitoSub);
    if (existing) return existing;
    return this.users.create(claims);
  }

  async getById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  async updateProfile(id: string, patch: UserUpdate): Promise<User> {
    const updated = await this.users.update(id, patch);
    if (!updated) throw new AppError('NOT_FOUND', 'User not found.');
    return updated;
  }

  /**
   * Irreversibly delete the account and all associated personal data (FR6, NFR10).
   * Personal data is removed first (DB delete cascades to dependent tables), then the
   * federated identity is removed from Cognito so the account cannot be resurrected.
   */
  async deleteAccount(user: Pick<User, 'id' | 'cognitoSub'>): Promise<void> {
    const deleted = await this.users.deleteById(user.id);
    if (!deleted) throw new AppError('NOT_FOUND', 'User not found.');
    await this.directory.deleteAccount(user.cognitoSub);
  }
}
