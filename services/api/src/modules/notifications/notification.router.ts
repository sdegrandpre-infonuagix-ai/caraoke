import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { NotificationService } from './notification.service.js';

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

/**
 * Notification routes (FR11).
 * - POST /push-tokens — register this device's push token for the signed-in user.
 */
export function createNotificationRouter(deps: {
  verifier: TokenVerifier;
  identityService: IdentityService;
  notificationService: NotificationService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.post('/push-tokens', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const parsed = registerTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'A token and platform are required.', {
          details: { issues: parsed.error.issues },
        }),
      );
    }

    deps.identityService
      .findOrCreate(claims)
      .then((user) =>
        deps.notificationService.registerToken(user.id, parsed.data.token, parsed.data.platform),
      )
      .then(() => res.status(201).json(ok({ registered: true })))
      .catch(next);
  });

  return router;
}
