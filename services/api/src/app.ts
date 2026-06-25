import express, { type Express } from 'express';
import { ok } from '@caraoke/shared';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * Build the Express app (architecture: modular monolith bootstrap).
 * Domain module routers (identity, pairing, session, ...) mount here in later epics.
 */
export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Liveness/readiness probe for ECS Express health checks.
  app.get('/health', (_req, res) => {
    res.json(ok({ status: 'ok', service: 'caraoke-api' }));
  });

  // Error envelope middleware MUST be last.
  app.use(errorHandler);

  return app;
}
