import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from './identity.service.js';

/**
 * Identity routes. `GET /me` is the post-sign-in sync endpoint: it verifies the Cognito JWT
 * and find-or-creates the users record (FR1), returning the current user. The first call
 * after a federated sign-in creates the account; subsequent calls reuse it.
 */
export function createIdentityRouter(deps: {
  service: IdentityService;
  verifier: TokenVerifier;
}): Router {
  const router = Router();

  router.get('/me', requireAuth(deps.verifier), (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) {
      next(new AppError('UNAUTHORIZED', 'No auth claims.'));
      return;
    }
    deps.service
      .findOrCreate(claims)
      .then((user) => res.json(ok(user)))
      .catch(next);
  });

  return router;
}
