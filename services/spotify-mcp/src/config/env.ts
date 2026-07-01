import { z } from 'zod';

/** Zod-validated environment for the Spotify MCP server. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CARAOKE_INTEGRATIONS: z.enum(['live', 'mock']).default('mock'),
  AWS_REGION: z.string().default('ca-central-1'),
  // Secrets Manager secret holding {clientId, clientSecret}. Required in live mode.
  SPOTIFY_SECRET_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  cached = envSchema.parse(source);
  return cached;
}
