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
  // LiveKit token-signing credentials (Story 4.1). Required to mint voice tokens in live mode.
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  // Aurora connection string (Story 2.2+). Optional until a DB-backed route is hit.
  DATABASE_URL: z.string().optional(),
  // Cognito (Story 2.2). Required to verify JWTs in live mode.
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  // Pairing invites (Story 3.1).
  INVITE_BASE_URL: z.string().url().default('https://caraoke.app'),
  SESSION_INVITE_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  // AppSync Events (Story 3.4). Required to publish real-time events in live mode.
  APPSYNC_EVENTS_HTTP_URL: z.string().url().optional(),
  APPSYNC_EVENTS_API_KEY: z.string().optional(),
  // Redis (Story 5.3). TTL-based discovery presence store.
  REDIS_URL: z.string().url().optional(),
  // Push notifications (Story 3.5). Deep-link scheme; optional Expo access token.
  APP_SCHEME: z.string().default('caraoke'),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  // Operator admin key (Story 6.5, FR37). Required to access the moderation queue.
  ADMIN_API_KEY: z.string().optional(),
  // Stripe subscription price ID (Story 7.1, FR38). The price users subscribe to.
  STRIPE_PRICE_ID: z.string().default('price_caraoke_monthly'),
  // Stripe webhook signing secret (Story 7.4, AR9). Required to verify webhook authenticity.
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  cached = envSchema.parse(source);
  return cached;
}
