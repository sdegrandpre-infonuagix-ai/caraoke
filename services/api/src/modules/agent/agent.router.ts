import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { AgentService } from './agent.service.js';
import { songRequestSchema } from './agent.schema.js';

/**
 * Voice-agent routes (Story 9.1).
 *
 *   POST /sessions/:id/agent — the host picks a song for the session.
 *     - Caller must be a session participant (host or guest).
 *     - Body: { query: string } — free-text song search (e.g. "Bohemian Rhapsody Queen").
 *     - Resolves the track via Spotify and broadcasts `song.proposed`. Does NOT start playback.
 *     - Returns 201 { data: { sessionId, track, proposedAt } }.
 *
 *   POST /sessions/:id/agent/start — a participant taps "Start singing".
 *     - Caller must be a session participant. No body.
 *     - Once ALL participants have confirmed, schedules the synchronized start (playback.scheduled).
 *     - Returns 200 { data: { status: 'waiting' | 'scheduled', ... } }.
 */
export function createAgentRouter(deps: {
  verifier: TokenVerifier;
  identityService: IdentityService;
  agentService: AgentService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.post('/sessions/:id/agent', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const parsed = songRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'A non-empty song query is required.', {
          details: { issues: parsed.error.issues },
        }),
      );
    }

    const sessionId = String(req.params.id);
    const { query } = parsed.data;

    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.agentService.handleSongRequest(sessionId, user.id, query))
      .then((result) => res.status(201).json(ok(result)))
      .catch(next);
  });

  router.post('/sessions/:id/agent/start', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const sessionId = String(req.params.id);
    deps.identityService
      .findOrCreate(claims)
      .then((user) => deps.agentService.confirmStart(sessionId, user.id))
      .then((result) => res.status(200).json(ok(result)))
      .catch(next);
  });

  return router;
}
