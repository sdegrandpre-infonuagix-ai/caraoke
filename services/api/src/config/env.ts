import { z } from 'zod';

/**
 * Zod-validated environment (architecture: Process Patterns — validate boundaries).
 * Fails fast at boot if required vars are missing/invalid.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  CARAOKE_INTEGRATIONS: z.enum(['live', 'mock']).default('mock'),
  AWS_REGION: z.string().default('ca-central-1'),
  // LiveKit SFU signaling URL (Story 1.5). Optional in mock mode.
  LIVEKIT_URL: z.string().url().optional(),
  // Aurora connection string (Story 2.2+). Optional until a DB-backed route is hit.
  DATABASE_URL: z.string().optional(),
  // Cognito (Story 2.2). Required to verify JWTs in live mode.
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  cached = envSchema.parse(source);
  return cached;
}
