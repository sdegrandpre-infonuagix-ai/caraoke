import { Router, type Request, type Response, type NextFunction } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { PlaybackControlService } from './playbackControl.service.js';

/**
 * Playback control routes (Story 4.4/4.6). All are participant-gated.
 *
 *   POST /sessions/:id/playback/prebuffer  { trackUri }  — load track paused (caller)
 *   POST /sessions/:id/playback/play                     — resume at T (caller)
 *   POST /sessions/:id/playback/seek       { positionMs } — drift correction (caller)
 *   POST /sessions/:id/playback/pause                    — pause BOTH participants
 *   POST /sessions/:id/playback/resume                   — resume BOTH participants
 *   POST /sessions/:id/playback/stop                     — pause both (session ends client-side)
 */
export function createPlaybackControlRouter(deps: {
  verifier: TokenVerifier;
  identityService: IdentityService;
  controlService: PlaybackControlService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  /** Resolve the caller's user id, run `op`, and return an empty ok envelope. */
  const run = (
    req: Request,
    res: Response,
    next: NextFunction,
    op: (sessionId: string, userId: string) => Promise<void>,
  ): void => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const sessionId = String(req.params.id);
    deps.identityService
      .findOrCreate(claims)
      .then((user) => op(sessionId, user.id))
      .then(() => res.json(ok({})))
      .catch(next);
  };

  router.post('/sessions/:id/playback/prebuffer', auth, (req, res, next) => {
    const trackUri = typeof req.body?.trackUri === 'string' ? req.body.trackUri : '';
    if (!trackUri) return next(new AppError('VALIDATION_FAILED', 'trackUri is required.'));
    run(req, res, next, (sessionId, userId) => deps.controlService.prebuffer(sessionId, userId, trackUri));
  });

  router.post('/sessions/:id/playback/play', auth, (req, res, next) => {
    run(req, res, next, (sessionId, userId) => deps.controlService.play(sessionId, userId));
  });

  router.post('/sessions/:id/playback/seek', auth, (req, res, next) => {
    const positionMs = Number(req.body?.positionMs);
    if (!Number.isFinite(positionMs)) return next(new AppError('VALIDATION_FAILED', 'positionMs is required.'));
    run(req, res, next, (sessionId, userId) => deps.controlService.seek(sessionId, userId, positionMs));
  });

  router.post('/sessions/:id/playback/pause', auth, (req, res, next) => {
    run(req, res, next, (sessionId, userId) => deps.controlService.pauseBoth(sessionId, userId));
  });

  router.post('/sessions/:id/playback/resume', auth, (req, res, next) => {
    run(req, res, next, (sessionId, userId) => deps.controlService.resumeBoth(sessionId, userId));
  });

  router.post('/sessions/:id/playback/stop', auth, (req, res, next) => {
    run(req, res, next, (sessionId, userId) => deps.controlService.stop(sessionId, userId));
  });

  return router;
}
