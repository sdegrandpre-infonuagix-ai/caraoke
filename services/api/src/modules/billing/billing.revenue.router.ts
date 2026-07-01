import { Router, type Request, type Response, type NextFunction } from 'express';
import { ok } from '@caraoke/shared';
import type { BillingRepository } from './billing.repository.js';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = process.env['ADMIN_API_KEY'];
  if (!key || req.headers['x-admin-key'] !== key) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Admin key required.' });
    return;
  }
  next();
}

/**
 * Revenue reporting routes (Story 8.6, FR47).
 *
 *   GET /admin/billing/revenue — MRR estimate, subscription counts, and churn.
 *     Figures reconcile with Stripe — active count × price = MRR estimate.
 */
export function createBillingRevenueRouter(deps: {
  repo: BillingRepository;
  /** Default price in cents (from env: STRIPE_MONTHLY_PRICE_CENTS). */
  monthlyPriceCents: number;
}): Router {
  const router = Router();

  router.get('/admin/billing/revenue', requireAdmin, async (_req, res, next) => {
    try {
      const counts = await deps.repo.getSubscriptionCounts();
      const activeCount = (counts['active'] ?? 0) + (counts['trialing'] ?? 0);
      const canceledCount = counts['canceled'] ?? 0;
      const pastDueCount = counts['past_due'] ?? 0;
      const totalPaid = activeCount + canceledCount + pastDueCount;
      const mrrCents = activeCount * deps.monthlyPriceCents;
      const churnRate = totalPaid > 0 ? canceledCount / totalPaid : 0;
      const failedPaymentRate = totalPaid > 0 ? pastDueCount / totalPaid : 0;

      res.json(
        ok({
          mrrCents,
          churnRate,
          failedPaymentRate,
          subscriptionCounts: counts,
          activeCount,
        }),
      );
    } catch (e) {
      next(e);
    }
  });

  return router;
}
