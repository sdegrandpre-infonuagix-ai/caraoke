export type AuthProvider = 'apple' | 'google' | 'cognito';

/** A Caraoke user (camelCase wire/TS shape). */
export interface User {
  id: string;
  cognitoSub: string;
  email: string;
  displayName: string | null;
  authProvider: AuthProvider;
  /** Preferred language (FR3) — drives UI (FR5) and Voice-Agent speech (FR4). */
  languagePref: string;
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
