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
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  cached = envSchema.parse(source);
  return cached;
}
