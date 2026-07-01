import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { TelemetryService } from './telemetry.service.js';

const feltTogetherSchema = z.object({
  sentiment: z.enum(['yes', 'no', 'unclear', 'no_response']),
  transcript: z.string().nullable().optional(),
});

const sessionHealthSchema = z.object({
  eventType: z.enum([
    'session_started',
    'drift_detected',
    'voice_latency',
    'session_ended',
    'session_failed',
  ]),
  sessionId: z.string().min(1),
  timestamp: z.string(),
  simultaneousStartOffsetMs: z.number().optional(),
  driftMs: z.number().optional(),
  correctionApplied: z.boolean().optional(),
  estimatedOneWayMs: z.number().optional(),
  durationMs: z.number().optional(),
  driftCorrectionCount: z.number().optional(),
  reason: z.string().max(200).optional(),
});

/**
 * Telemetry routes (Story 8.1/8.2, FR42/FR43/AR7).
 *
 *   POST /sessions/:sessionId/feedback/felt-together — persist felt-together sentiment (FR42).
 *   GET  /telemetry/felt-together/rate              — aggregated rate for operator dashboard.
 *   POST /telemetry/session-health                  — session-health event → Firehose (FR43/AR7).
 */
export function createTelemetryRouter(deps: {
  verifier: TokenVerifier;
  service: TelemetryService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  // POST /sessions/:sessionId/feedback/felt-together (FR42)
  router.post('/sessions/:sessionId/feedback/felt-together', auth, async (req, res, next) => {
    if (!req.authClaims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = feltTogetherSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'Invalid felt-together payload.'));
    try {
      await deps.service.recordFeltTogether(
        req.authClaims.sub,
        String(req.params.sessionId),
        parsed.data.sentiment,
      );
      res.json(ok(null));
    } catch (e) {
      next(e);
    }
  });

  // GET /telemetry/felt-together/rate?days=N (operator dashboard, FR42 aggregation)
  router.get('/telemetry/felt-together/rate', auth, async (req, res, next) => {
    if (!req.authClaims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const days = Math.max(1, Math.min(365, parseInt(String(req.query.days ?? '7'), 10) || 7));
    try {
      const result = await deps.service.getFeltTogetherRate(days);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  });

  router.post('/telemetry/session-health', auth, async (req, res, next) => {
    if (!req.authClaims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = sessionHealthSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'Invalid telemetry event.'));
    try {
      await deps.service.emit(parsed.data as Record<string, unknown>);
      res.json(ok(null));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
