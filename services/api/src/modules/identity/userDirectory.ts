import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { loadEnv } from '../../config/env.js';

/**
 * Identity-provider directory port. Deleting an account must also remove the federated
 * identity so a deleted user can't keep signing into a zombie account (FR6).
 */
export interface UserDirectory {
  /** Delete the user from the IdP by their Cognito username (the `sub`). No-op if absent. */
  deleteAccount(cognitoSub: string): Promise<void>;
}

/** Live Cognito implementation (AdminDeleteUser). */
export class CognitoUserDirectory implements UserDirectory {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;

  constructor() {
    const env = loadEnv();
    if (!env.COGNITO_USER_POOL_ID) {
      throw new Error('COGNITO_USER_POOL_ID is required for account deletion.');
    }
    this.userPoolId = env.COGNITO_USER_POOL_ID;
    this.client = new CognitoIdentityProviderClient({ region: env.AWS_REGION });
  }

  async deleteAccount(cognitoSub: string): Promise<void> {
    await this.client.send(
      new AdminDeleteUserCommand({ UserPoolId: this.userPoolId, Username: cognitoSub }),
    );
  }
}

/** No-op directory for mock mode / tests (no AWS access). */
export class NoopUserDirectory implements UserDirectory {
  async deleteAccount(): Promise<void> {
    /* nothing to do */
  }
}
