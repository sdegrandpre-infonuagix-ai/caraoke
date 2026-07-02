import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { AgeVerificationService } from './ageVerification.service.js';

const resultQuerySchema = z.object({ sessionId: z.string().min(1) });

/**
 * Age-verification routes (Story 5.2, FR32, NFR11).
 *   POST /age-verification/session  — creates a Stripe Identity session for the device to present.
 *   GET  /age-verification/result   — retrieves is18Plus after FlowCompleted; never returns the ID.
 */
export function createAgeVerificationRouter(deps: {
  verifier: TokenVerifier;
  service: AgeVerificationService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.post('/age-verification/session', auth, (req, res, next) => {
    if (!req.authClaims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.service
      .createSession(req.authClaims.cognitoSub)
      .then((result) => res.status(201).json(ok(result)))
      .catch(next);
  });

  router.get('/age-verification/result', auth, (req, res, next) => {
    if (!req.authClaims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = resultQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'sessionId required'));
    deps.service
      .getResult(parsed.data.sessionId, req.authClaims.cognitoSub)
      .then((result) => res.json(ok(result)))
      .catch(next);
  });

  return router;
}
