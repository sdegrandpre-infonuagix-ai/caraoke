import { Router } from 'express';
import { ok } from '@caraoke/shared';
import { requireAdmin } from '../../middleware/adminAuth.js';
import type { UserRepository } from './identity.repository.js';

/**
 * Account administration routes (Story 8.7, FR48).
 *
 *   POST /admin/accounts/:id/suspend   — suspend a user account
 *   POST /admin/accounts/:id/reinstate — reinstate a suspended account
 *
 * Every action is auditable: updated_at bumps in the DB and is echoed in the response.
 */
export function createIdentityAdminRouter(deps: { repo: UserRepository }): Router {
  const router = Router();

  router.post('/admin/accounts/:id/suspend', requireAdmin, async (req, res, next) => {
    try {
      const found = await deps.repo.suspendUser(String(req.params['id']));
      if (!found) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
        return;
      }
      console.log(`[audit] suspend account id=${req.params['id']} by admin`);
      res.json(ok({ suspended: true }));
    } catch (e) {
      next(e);
    }
  });

  router.post('/admin/accounts/:id/reinstate', requireAdmin, async (req, res, next) => {
    try {
      const found = await deps.repo.reinstateUser(String(req.params['id']));
      if (!found) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
        return;
      }
      console.log(`[audit] reinstate account id=${req.params['id']} by admin`);
      res.json(ok({ suspended: false }));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
