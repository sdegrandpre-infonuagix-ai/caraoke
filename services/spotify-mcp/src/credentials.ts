import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { z } from 'zod';
import type { Env } from './config/env.js';

/** Spotify app credentials used for OAuth/token refresh (NOT user tokens). */
export interface SpotifyAppCredentials {
  clientId: string;
  clientSecret: string;
}

const credsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

/**
 * Load Spotify app credentials. In live mode they come from Secrets Manager — NEVER
 * hard-coded (NFR7). In mock/sandbox mode we return inert placeholders so CI/offline dev
 * needs no AWS access.
 */
export async function loadSpotifyCredentials(env: Env): Promise<SpotifyAppCredentials> {
  if (env.CARAOKE_INTEGRATIONS === 'mock') {
    return { clientId: 'mock-client-id', clientSecret: 'mock-client-secret' };
  }

  if (!env.SPOTIFY_SECRET_ID) {
    throw new Error('SPOTIFY_SECRET_ID is required when CARAOKE_INTEGRATIONS=live');
  }

  const client = new SecretsManagerClient({ region: env.AWS_REGION });
  const out = await client.send(
    new GetSecretValueCommand({ SecretId: env.SPOTIFY_SECRET_ID }),
  );
  if (!out.SecretString) {
    throw new Error(`Secret ${env.SPOTIFY_SECRET_ID} has no string value`);
  }
  return credsSchema.parse(JSON.parse(out.SecretString));
}
