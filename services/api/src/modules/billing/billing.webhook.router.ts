import express, { Router, type Request, type Response, type NextFunction } from 'express';
import Stripe from 'stripe';
import { processWebhookEvent } from './webhook.handler.js';
import type { BillingRepository } from './billing.repository.js';

/**
 * Stripe webhook router (Story 7.4, AR9).
 * MUST be mounted BEFORE express.json() — Stripe signature verification requires the raw body.
 *
 *   POST /billing/webhook — receives Stripe events, verifies signature, dispatches idempotently.
 */
export function createBillingWebhookRouter(deps: {
  repo: BillingRepository;
  webhookSecret: string | undefined;
}): Router {
  const router = Router();

  router.post(
    '/billing/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response, next: NextFunction) => {
      const sig = req.headers['stripe-signature'];

      if (!deps.webhookSecret) {
        // Mock/dev mode — accept without verification.
        res.json({ received: true, verified: false });
        return;
      }

      if (!sig) {
        res.status(400).json({ error: 'Missing stripe-signature header.' });
        return;
      }

      let event: Stripe.Event;
      try {
        event = Stripe.webhooks.constructEvent(
          req.body as Buffer,
          sig,
          deps.webhookSecret,
        );
      } catch {
        res.status(400).json({ error: 'Webhook signature verification failed.' });
        return;
      }

      try {
        await processWebhookEvent(event, deps.repo);
        res.json({ received: true, verified: true });
      } catch (e) {
        next(e);
      }
    },
  );

  return router;
}
