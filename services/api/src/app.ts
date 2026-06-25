import express, { type Express } from 'express';
import { ok } from '@caraoke/shared';
import { errorHandler } from './middleware/errorHandler.js';
import { loadEnv } from './config/env.js';
import { getMediaServer } from './integrations/media/index.js';
import { CognitoTokenVerifier, type TokenVerifier } from './middleware/auth.js';
import { PgUserRepository } from './modules/identity/identity.repository.js';
import { IdentityService } from './modules/identity/identity.service.js';
import { createIdentityRouter } from './modules/identity/identity.router.js';

export interface AppDeps {
  /** Override the token verifier (tests). Defaults to the live Cognito verifier. */
  verifier?: TokenVerifier;
  /** Override the identity service (tests). Defaults to a Postgres-backed service. */
  identityService?: IdentityService;
}

/**
 * Build the Express app (architecture: modular monolith bootstrap).
 * Domain module routers (identity, pairing, session, ...) mount here in later epics.
 */
export function createApp(deps: AppDeps = {}): Express {
  const app = express();
  app.use(express.json());

  // Media-server (LiveKit) accessed only via the integration abstraction (NFR20).
  const media = getMediaServer(loadEnv());

  // Identity (Story 2.2). Verifier + service are injectable for tests.
  const verifier = deps.verifier ?? new CognitoTokenVerifier();
  const identityService = deps.identityService ?? new IdentityService(new PgUserRepository());

  // Liveness/readiness probe for ECS Express health checks.
  app.get('/health', (_req, res) => {
    res.json(ok({ status: 'ok', service: 'caraoke-api' }));
  });

  // Live-voice plane reachability (Story 1.5): reports the SFU health via the abstraction.
  app.get('/health/livekit', (_req, res, next) => {
    media
      .health()
      .then((health) => {
        res.status(health.healthy ? 200 : 503).json(ok({ ...health, url: media.signalingUrl() }));
      })
      .catch(next);
  });

  // Identity routes (FR1).
  app.use('/', createIdentityRouter({ service: identityService, verifier }));

  // Error envelope middleware MUST be last.
  app.use(errorHandler);

  return app;
}
