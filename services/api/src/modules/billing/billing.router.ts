import { Router } from 'express';
import { z } from 'zod';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { BillingService } from './billing.service.js';
import type { IdentityService } from '../identity/identity.service.js';

const subscribeSchema = z.object({
  paymentMethodId: z.string().min(1),
});

const planChangeSchema = z.object({
  priceId: z.string().min(1),
});

/**
 * Billing routes (Story 7.1, FR38/FR41/NFR7).
 *
 * Card data never reaches Caraoke — the mobile Stripe SDK collects it directly.
 *   POST /billing/setup-intent  — get a clientSecret to collect a payment method on-device
 *   POST /billing/subscribe     — attach collected method and activate subscription
 *   GET  /billing/status        — current subscription status for the caller
 */
export function createBillingRouter(deps: {
  verifier: TokenVerifier;
  service: BillingService;
  identityService: IdentityService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.post('/billing/setup-intent', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      const email = user.email ?? claims.sub;
      const { clientSecret } = await deps.service.createSetupIntent(user.id, email);
      res.json(ok({ clientSecret }));
    } catch (e) {
      next(e);
    }
  });

  router.post('/billing/subscribe', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'paymentMethodId required'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      const email = user.email ?? claims.sub;
      const result = await deps.service.subscribe(user.id, email, parsed.data.paymentMethodId);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  });

  // DELETE /billing/subscription — cancel at period end (FR39)
  router.delete('/billing/subscription', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      const result = await deps.service.cancelSubscription(user.id);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  });

  // PATCH /billing/subscription/plan — upgrade or downgrade (FR39)
  router.patch('/billing/subscription/plan', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    const parsed = planChangeSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('BAD_REQUEST', 'priceId required'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      const email = user.email ?? claims.sub;
      const result = await deps.service.changePlan(user.id, email, parsed.data.priceId);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  });

  // GET /billing/history — itemized invoice list with receipt URLs (FR40)
  router.get('/billing/history', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      const invoices = await deps.service.getBillingHistory(user.id);
      res.json(ok({ invoices }));
    } catch (e) {
      next(e);
    }
  });

  router.get('/billing/status', auth, async (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    try {
      const user = await deps.identityService.findOrCreate(claims);
      const status = await deps.service.getStatus(user.id);
      res.json(ok(status));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
