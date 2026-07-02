import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { DiscoveryService } from './discovery.service.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { SavedPartnerService } from '../pairing/savedPartner.service.js';

const publishSchema = z.object({
  plusCode: z.string().min(4).max(20),
});

const nearbySchema = z.object({
  plusCode: z.string().min(4).max(20),
});

const connectSchema = z.object({
  targetUserId: z.string().min(1),
});

/**
 * Discovery routes (Story 5.3/5.4/5.5, FR28/FR29/FR30/FR31, NFR9).
 *   PUT    /discovery/location  — publish coarse Plus Code (never precise coords).
 *   DELETE /discovery/location  — revoke (remove from Redis immediately).
 *   GET    /discovery/nearby    — fetch discoverable users in the same Plus Code area.
 *   POST   /discovery/connect   — save as partner and revoke their location (go-dark, FR31).
 */
export function createDiscoveryRouter(deps: {
  verifier: TokenVerifier;
  service: DiscoveryService;
  identityService: IdentityService;
  savedPartnerService: SavedPartnerService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.put('/discovery/location', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'plusCode required'));

    try {
      const user = await deps.identityService.findOrCreate(claims);
      // Never publish the raw email as a display name — it's returned to nearby strangers (NFR9).
      // Fall back to a neutral, non-identifying label when the user hasn't set a display name.
      await deps.service.publishLocation(user.id, user.displayName ?? 'A nearby singer', parsed.data.plusCode);
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
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'plusCode required'));

    try {
      const user = await deps.identityService.findOrCreate(claims);
      const nearby = await deps.service.getNearby(parsed.data.plusCode, user.id);
      res.json(ok(nearby));
    } catch (e) {
      next(e);
    }
  });

  // POST /discovery/connect — one-shot handshake: save partner + revoke their Redis entry (FR30/FR31).
  // Revoking the target's location entry makes them go-dark immediately — no ongoing tracking.
  router.post('/discovery/connect', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = connectSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'targetUserId required'));

    try {
      const user = await deps.identityService.findOrCreate(claims);
      // The target must currently be broadcasting discovery, otherwise this endpoint would let
      // anyone save an arbitrary user as a partner and force-revoke any user's location by id
      // (griefing / non-consensual go-dark). Requiring a live entry ties connect to a real,
      // in-progress discovery interaction. save() additionally rejects blocked pairs (FR33).
      const target = await deps.service.getLocation(parsed.data.targetUserId);
      if (!target) {
        return next(new AppError('NOT_FOUND', 'That singer is no longer discoverable.'));
      }
      await deps.savedPartnerService.save(user.id, target.userId);
      await deps.service.revokeLocation(target.userId);
      res.json(ok(null));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
