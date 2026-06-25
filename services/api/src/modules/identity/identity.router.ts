import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from './identity.service.js';
import { updateProfileSchema } from './identity.schema.js';

/**
 * Identity routes (FR1, FR6).
 * - GET    /me  — post-sign-in sync: verify JWT, find-or-create the users record, return it.
 * - PATCH  /me  — edit profile fields; persists via the uniform {data,error} envelope.
 * - DELETE /me  — irreversible cascading account + identity deletion.
 *
 * All three resolve the caller to a users record via find-or-create so a freshly signed-in
 * user can edit/delete immediately.
 */
export function createIdentityRouter(deps: {
  service: IdentityService;
  verifier: TokenVerifier;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.get('/me', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.service
      .findOrCreate(claims)
      .then((user) => res.json(ok(user)))
      .catch(next);
  });

  router.patch('/me', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'Invalid profile update.', {
          details: { issues: parsed.error.issues },
        }),
      );
    }

    deps.service
      .findOrCreate(claims)
      .then((user) => deps.service.updateProfile(user.id, parsed.data))
      .then((user) => res.json(ok(user)))
      .catch(next);
  });

  router.delete('/me', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    deps.service
      .findOrCreate(claims)
      .then((user) => deps.service.deleteAccount(user))
      .then(() => res.json(ok({ deleted: true })))
      .catch(next);
  });

  return router;
}
