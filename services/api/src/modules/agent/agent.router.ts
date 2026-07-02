import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { AgentService } from './agent.service.js';
import { songRequestSchema } from './agent.schema.js';

/**
 * Voice-agent routes (Story 9.1).
 *
 *   POST /sessions/:id/agent — submit a song request for the session.
 *     - Caller must be a session participant (host or guest).
 *     - Body: { query: string } — free-text song search (e.g. "Bohemian Rhapsody Queen").
 *     - Resolves the track via Spotify and schedules a synchronized start (Story 9.2).
 *     - Returns 201 { data: { sessionId, track, scheduledAt } }.
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

  return router;
}
