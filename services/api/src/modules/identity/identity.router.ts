import { Router } from 'express';
import { ok, AppError } from '@caraoke/shared';
import { requireAuth, type TokenVerifier } from '../../middleware/auth.js';
import type { IdentityService } from './identity.service.js';
import type { SpotifyService } from './spotify.service.js';
import { updateProfileSchema } from './identity.schema.js';
import { linkSpotifySchema } from './spotify.schema.js';

/**
 * Identity routes (FR1, FR6).
 * - GET    /me  — post-sign-in sync: verify JWT, find-or-create the users record, return it.
 * - PATCH  /me  — edit profile fields; persists via the uniform {data,error} envelope.
 * - DELETE /me  — irreversible cascading account + identity deletion.
 *
 * All three resolve the caller to a users record via find-or-create so a freshly signed-in
 * user can edit/delete immediately.
 */
export function createIdentityRouter(deps: {
  service: IdentityService;
  verifier: TokenVerifier;
  spotifyService: SpotifyService;
}): Router {
  const router = Router();
  const auth = requireAuth(deps.verifier);

  router.get('/me', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.service
      .findOrCreate(claims)
      .then((user) => res.json(ok(user)))
      .catch(next);
  });

  router.patch('/me', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'Invalid profile update.', {
          details: { issues: parsed.error.issues },
        }),
      );
    }

    deps.service
      .findOrCreate(claims)
      .then((user) => deps.service.updateProfile(user.id, parsed.data))
      .then((user) => res.json(ok(user)))
      .catch(next);
  });

  router.delete('/me', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    deps.service
      .findOrCreate(claims)
      .then((user) => deps.service.deleteAccount(user))
      .then(() => res.json(ok({ deleted: true })))
      .catch(next);
  });

  // Data export (Story 6.4, FR36/NFR10) — returns the user's profile data for GDPR portability.
  router.get('/me/export', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.service
      .findOrCreate(claims)
      .then((user) =>
        res
          .header('Content-Disposition', `attachment; filename="caraoke-data-${user.id}.json"`)
          .header('Content-Type', 'application/json')
          .json(
            ok({
              exportedAt: new Date().toISOString(),
              profile: user,
              dataNotice: {
                voice: 'Live only — never recorded, no biometric/voiceprint storage (NFR8).',
                location: 'Coarse Plus Code only, 5-min TTL, no persistent trail (NFR9).',
                retention: 'Profile retained for 90 days post-deletion, then purged (NFR10).',
              },
            }),
          ),
      )
      .catch(next);
  });

  // --- Spotify link + Premium verification (FR2) ---

  router.get('/me/spotify', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));
    deps.service
      .findOrCreate(claims)
      .then((user) => deps.spotifyService.getStatus(user.id))
      .then((status) => res.json(ok(status)))
      .catch(next);
  });

  router.post('/me/spotify', auth, (req, res, next) => {
    const claims = req.authClaims;
    if (!claims) return next(new AppError('UNAUTHORIZED', 'No auth claims.'));

    const parsed = linkSpotifySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'Invalid Spotify link request.', {
          details: { issues: parsed.error.issues },
        }),
      );
    }

    deps.service
      .findOrCreate(claims)
      .then((user) =>
        deps.spotifyService.link(user.id, parsed.data.accessToken, parsed.data.refreshToken),
      )
      .then((status) => res.json(ok(status)))
      .catch(next);
  });

  return router;
}
