import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { DiscoveryService } from './discovery.service.js';
import type { IdentityService } from '../identity/identity.service.js';

const publishSchema = z.object({
  plusCode: z.string().min(4).max(20),
});

const nearbySchema = z.object({
  plusCode: z.string().min(4).max(20),
});

/**
 * Discovery routes (Story 5.3/5.4, FR28/FR29, NFR9).
 *   PUT    /discovery/location  — publish coarse Plus Code (never precise coords).
 *   DELETE /discovery/location  — revoke (remove from Redis immediately).
 *   GET    /discovery/nearby    — fetch discoverable users in the same Plus Code area.
 */
export function createDiscoveryRouter(deps: {
  verifier: TokenVerifier;
  service: DiscoveryService;
  identityService: IdentityService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.put('/discovery/location', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'plusCode required'));

    try {
      const user = await deps.identityService.findOrCreate(claims);
      await deps.service.publishLocation(user.id, user.displayName ?? claims.email, parsed.data.plusCode);
      res.json(ok(null));
    } catch (e) {
      next(e);
    }
  });

  router.delete('/discovery/location', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      await deps.service.revokeLocation(user.id);
      res.json(ok(null));
    } catch (e) {
      next(e);
    }
  });

  router.get('/discovery/nearby', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = nearbySchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'plusCode required'));

    try {
      const user = await deps.identityService.findOrCreate(claims);
      const nearby = await deps.service.getNearby(parsed.data.plusCode, user.id);
      res.json(ok(nearby));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
