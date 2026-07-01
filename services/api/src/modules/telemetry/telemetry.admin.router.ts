import { Router, type Request, type Response, type NextFunction } from 'express';
import { ok } from '@caraoke/shared';
import type { TelemetryService } from './telemetry.service.js';

/**
 * Admin-only telemetry / metrics routes (Story 8.4, FR44).
 * Protected by the same X-Admin-Key header guard used by the moderation admin routes.
 *
 *   GET /admin/metrics/dashboard — key venture metrics for the ops console.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = process.env['ADMIN_API_KEY'];
  if (!key || req.headers['x-admin-key'] !== key) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Admin key required.' });
    return;
  }
  next();
}

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
