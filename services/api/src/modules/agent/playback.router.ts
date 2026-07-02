// Playback position route (Story 9.4, FR20/NFR2).
// Mobile drift-correction loop polls this every SAMPLE_INTERVAL_MS to get the real Spotify
// position, which replaces the broken estimatePosition() pattern in useDriftCorrection.ts.

import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { PlaybackPositionService } from './playback.service.js';

/**
 * Playback position routes (Story 9.4).
 *
 *   GET /sessions/:id/playback/position
 *     - Caller must be a session participant (enforced inside PlaybackPositionService).
 *     - Samples the user's real Spotify progress_ms via the stored OAuth refresh token.
 *     - Returns 200 { data: { positionMs: number } }.
 */
export function createPlaybackRouter(deps: {
  verifier: TokenVerifier;
  identityService: IdentityService;
  positionService: PlaybackPositionService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.get('/sessions/:id/playback/position', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const sessionId = String(req.params.id);

    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.positionService.getPosition(sessionId, user.id))
      .then((pos) => res.json(ok(pos)))
      .catch(next);
  });

  return router;
}
