import { Router, type Request, type Response, type NextFunction } from 'express';
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

const resolveSchema = z.object({
  note: z.string().max(1000).optional(),
});

/**
 * Operator admin-key guard (Story 6.5, FR37).
 * Reads ADMIN_API_KEY from the env at request time so the key can be rotated without restart.
 */
function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = process.env['ADMIN_API_KEY'];
  if (!key || req.headers['x-admin-key'] !== key) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Admin key required.' });
    return;
  }
  next();
}

/**
 * Moderation routes (Story 6.1/6.5, FR33/FR37).
 *
 * User-facing:
 *   POST /moderation/block  — block a user (prevents future pairing, bidirectional check).
 *   POST /moderation/report — file an abuse report; auto-escalates at repeat-offender threshold.
 *
 * Operator queue (requires X-Admin-Key header):
 *   GET  /admin/moderation/queue           — pending + escalated reports, escalated first.
 *   POST /admin/moderation/reports/:id/resolve — mark resolved + log note (audit trail).
 */
export function createModerationRouter(deps: {
  verifier: TokenVerifier;
  service: ModerationService;
  identityService: IdentityService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  // --- User-facing ---

  router.post('/moderation/block', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'targetUserId required'));
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
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'targetUserId required'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      const { escalated } = await deps.service.report(
        user.id,
        parsed.data.targetUserId,
        parsed.data.sessionId ?? null,
        parsed.data.reason ?? null,
      );
      res.json(ok({ escalated }));
    } catch (e) {
      next(e);
    }
  });

  // --- Operator queue ---

  router.get('/admin/moderation/queue', requireAdmin, async (_req, res, next) => {
    try {
      const queue = await deps.service.getReviewQueue();
      res.json(ok({ queue, total: queue.length }));
    } catch (e) {
      next(e);
    }
  });

  router.post('/admin/moderation/reports/:id/resolve', requireAdmin, async (req, res, next) => {
    const parsed = resolveSchema.safeParse(req.body);
    const note = parsed.success ? (parsed.data.note ?? null) : null;
    try {
      await deps.service.resolveReport(String(req.params.id), note);
      res.json(ok({ resolved: true }));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
