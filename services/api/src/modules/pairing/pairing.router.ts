import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { PairingService } from './pairing.service.js';

/**
 * Pairing routes (FR7).
 * - POST /sessions — create a duet session and return the invite link + pairing code.
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

  return router;
}
