import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { PairingService } from './pairing.service.js';
import type { SavedPartnerService } from './savedPartner.service.js';
import { joinSessionSchema, savePartnerSchema } from './pairing.schema.js';

/**
 * Pairing routes (FR7, FR8, FR9).
 * - POST   /sessions               — create a session + invite link/pairing code.
 * - POST   /sessions/join          — join via invite token or pairing code; both connect.
 * - GET    /partners               — list saved partners.
 * - POST   /partners               — save a known partner.
 * - DELETE /partners/:partnerId    — forget a saved partner.
 * - POST   /partners/:partnerId/repair — fast re-pair (pre-assigned partner).
 */
export function createPairingRouter(deps: {
  verifier: TokenVerifier;
  identityService: IdentityService;
  pairingService: PairingService;
  savedPartnerService: SavedPartnerService;
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

  // --- Saved partners + fast re-pair (FR9) ---

  router.get('/partners', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.savedPartnerService.list(user.id))
      .then((items) => res.json(ok({ items })))
      .catch(next);
  });

  router.post('/partners', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const parsed = savePartnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'A valid partnerUserId is required.', {
          details: { issues: parsed.error.issues },
        }),
      );
    }

    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.savedPartnerService.save(user.id, parsed.data.partnerUserId))
      .then(() => res.status(201).json(ok({ saved: true })))
      .catch(next);
  });

  router.delete('/partners/:partnerId', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.savedPartnerService.remove(user.id, String(req.params.partnerId)))
      .then(() => res.json(ok({ removed: true })))
      .catch(next);
  });

  router.post('/partners/:partnerId/repair', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.savedPartnerService.repair(user.id, String(req.params.partnerId)))
      .then((connection) => res.status(201).json(ok(connection)))
      .catch(next);
  });

  return router;
}
