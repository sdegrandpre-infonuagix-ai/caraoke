import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { ModerationService } from './moderation.service.js';
import type { IdentityService } from '../identity/identity.service.js';

const blockSchema = z.object({
  targetUserId: z.string().min(1),
});

const reportSchema = z.object({
  targetUserId: z.string().min(1),
  sessionId: z.string().optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Moderation routes (Story 6.1, FR33).
 *   POST /moderation/block  — block a user (prevents future pairing, bidirectional check).
 *   POST /moderation/report — file an abuse report with optional session context.
 */
export function createModerationRouter(deps: {
  verifier: TokenVerifier;
  service: ModerationService;
  identityService: IdentityService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.post('/moderation/block', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'targetUserId required'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      await deps.service.block(user.id, parsed.data.targetUserId);
      res.json(ok(null));
    } catch (e) {
      next(e);
    }
  });

  router.post('/moderation/report', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'targetUserId required'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      await deps.service.report(
        user.id,
        parsed.data.targetUserId,
        parsed.data.sessionId ?? null,
        parsed.data.reason ?? null,
      );
      res.json(ok(null));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
