export type AuthProvider = 'apple' | 'google' | 'cognito';

/** A Caraoke user (camelCase wire/TS shape). */
export interface User {
  id: string;
  cognitoSub: string;
  email: string;
  displayName: string | null;
  authProvider: AuthProvider;
  createdAt: string;
  updatedAt: string;
}

/** Verified identity claims extracted from a Cognito JWT. */
export interface AuthClaims {
  cognitoSub: string;
  email: string;
  displayName?: string;
  authProvider: AuthProvider;
}
