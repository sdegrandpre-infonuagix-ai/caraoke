import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import type { BillingRepository } from './billing.repository.js';
import type { StripeBillingProvider } from '../../integrations/stripe/billing.provider.js';

const refundSchema = z.object({
  chargeId: z.string().min(1),
  amountCents: z.number().int().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = process.env['ADMIN_API_KEY'];
  if (!key || req.headers['x-admin-key'] !== key) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Admin key required.' });
    return;
  }
  next();
}

/**
 * Billing admin routes (Story 8.5, FR45/FR46).
 *
 *   GET  /admin/billing/customers    — list Stripe customers and subscription status.
 *   POST /admin/billing/refund       — issue a refund; action is logged (FR46).
 */
export function createBillingAdminRouter(deps: {
  repo: BillingRepository;
  stripe: StripeBillingProvider;
}): Router {
  const router = Router();

  router.get('/admin/billing/customers', requireAdmin, async (req, res, next) => {
    try {
      const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? '50'), 10) || 50));
      const customers = await deps.stripe.listAdminCustomers(limit);
      res.json(ok({ customers, total: customers.length }));
    } catch (e) {
      next(e);
    }
  });

  router.post('/admin/billing/refund', requireAdmin, async (req, res, next) => {
    const parsed = refundSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'chargeId required'));
    try {
      const result = await deps.stripe.createRefund(
        parsed.data.chargeId,
        parsed.data.amountCents,
        parsed.data.reason,
      );
      // FR46: log every refund action for audit trail
      console.log('[AUDIT] admin/billing/refund', { chargeId: parsed.data.chargeId, ...result });
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
