import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { PairingService } from './pairing.service.js';
import { joinSessionSchema } from './pairing.schema.js';

/**
 * Pairing routes (FR7, FR8).
 * - POST /sessions      — create a duet session and return the invite link + pairing code.
 * - POST /sessions/join — join via invite token (link) or pairing code; both partners connect.
 */
export function createPairingRouter(deps: {
  verifier: TokenVerifier;
  identityService: IdentityService;
  pairingService: PairingService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.post('/sessions', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.pairingService.createSession(user.id))
      .then((result) => res.status(201).json(ok(result)))
      .catch(next);
  });

  router.post('/sessions/join', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const parsed = joinSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'Provide an invite link or a pairing code.', {
          details: { issues: parsed.error.issues },
        }),
      );
    }

    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.pairingService.join(parsed.data, user.id))
      .then((connection) => res.json(ok(connection)))
      .catch(next);
  });

  return router;
}
