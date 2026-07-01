import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { TelemetryService } from './telemetry.service.js';

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
 * Telemetry routes (Story 8.1, FR43/AR7).
 *
 *   POST /telemetry/session-health — ingest a session-health event from the mobile client.
 *     Server scrubs any PII before forwarding to Firehose (NFR6/8/9).
 */
export function createTelemetryRouter(deps: {
  verifier: TokenVerifier;
  service: TelemetryService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

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
