import type { UserRepository } from './identity.repository.js';
import type { AuthClaims, User } from './identity.types.js';

/**
 * Identity domain logic. `findOrCreate` realizes FR1: the first authenticated call after a
 * federated sign-in creates the users record; returning sign-ins reuse the existing account
 * (looked up by the stable Cognito subject).
 */
export class IdentityService {
  constructor(private readonly users: UserRepository) {}

  async findOrCreate(claims: AuthClaims): Promise<User> {
    const existing = await this.users.findByCognitoSub(claims.cognitoSub);
    if (existing) return existing;
    return this.users.create(claims);
  }

  async getById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }
}
