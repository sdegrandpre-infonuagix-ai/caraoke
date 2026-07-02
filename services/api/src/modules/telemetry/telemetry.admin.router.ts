import { Router } from 'express';
import { ok } from '@caraoke/shared';
import { requireAdmin } from '../../middleware/adminAuth.js';
import type { TelemetryService } from './telemetry.service.js';

/**
 * Admin-only telemetry / metrics routes (Story 8.4, FR44).
 * Protected by the same X-Admin-Key header guard used by the moderation admin routes.
 *
 *   GET /admin/metrics/dashboard — key venture metrics for the ops console.
 */

export function createTelemetryAdminRouter(deps: { service: TelemetryService }): Router {
  const router = Router();

  router.get('/admin/metrics/dashboard', requireAdmin, async (_req, res, next) => {
    try {
      const [rate7d, rate30d] = await Promise.all([
        deps.service.getFeltTogetherRate(7),
        deps.service.getFeltTogetherRate(30),
      ]);
      res.json(
        ok({
          feltTogether: { sevenDay: rate7d, thirtyDay: rate30d },
          // Latency and drift distributions are surfaced via Athena/CloudWatch (AR7).
          // In mock mode these are omitted — operators query Athena directly for distributions.
        }),
      );
    } catch (e) {
      next(e);
    }
  });

  return router;
}
