import express, { type Express } from 'express';
import { ok } from '@caraoke/shared';
import { errorHandler } from './middleware/errorHandler.js';
import { loadEnv } from './config/env.js';
import { getMediaServer } from './integrations/media/index.js';
import { CognitoTokenVerifier, type TokenVerifier } from './middleware/auth.js';
import { PgUserRepository } from './modules/identity/identity.repository.js';
import { IdentityService } from './modules/identity/identity.service.js';
import { createIdentityRouter } from './modules/identity/identity.router.js';
import { CognitoUserDirectory, NoopUserDirectory } from './modules/identity/userDirectory.js';
import { SpotifyService } from './modules/identity/spotify.service.js';
import { PgSpotifyLinkRepository } from './modules/identity/spotify.repository.js';
import { getSpotifyProvider } from './integrations/spotify/index.js';
import { PairingService } from './modules/pairing/pairing.service.js';
import { PgSessionRepository } from './modules/pairing/pairing.repository.js';
import { createPairingRouter } from './modules/pairing/pairing.router.js';
import { SavedPartnerService } from './modules/pairing/savedPartner.service.js';
import { PgSavedPartnerRepository } from './modules/pairing/savedPartner.repository.js';
import { SessionReadyService } from './modules/pairing/ready.service.js';
import { getEventPublisher } from './events/index.js';
import { NotificationService } from './modules/notifications/notification.service.js';
import { PgPushTokenRepository } from './modules/notifications/pushToken.repository.js';
import { createNotificationRouter } from './modules/notifications/notification.router.js';
import { getPushSender } from './integrations/push/index.js';

export interface AppDeps {
  /** Override the token verifier (tests). Defaults to the live Cognito verifier. */
  verifier?: TokenVerifier;
  /** Override the identity service (tests). Defaults to a Postgres-backed service. */
  identityService?: IdentityService;
  /** Override the Spotify service (tests). Defaults to provider+Postgres-backed. */
  spotifyService?: SpotifyService;
  /** Override the pairing service (tests). Defaults to a Postgres-backed service. */
  pairingService?: PairingService;
  /** Override the saved-partner service (tests). Defaults to a Postgres-backed service. */
  savedPartnerService?: SavedPartnerService;
  /** Override the ready-handshake service (tests). Defaults to Postgres + event publisher. */
  readyService?: SessionReadyService;
  /** Override the notification service (tests). Defaults to push + Postgres-backed. */
  notificationService?: NotificationService;
}

/**
 * Build the Express app (architecture: modular monolith bootstrap).
 * Domain module routers (identity, pairing, session, ...) mount here in later epics.
 */
export function createApp(deps: AppDeps = {}): Express {
  const app = express();
  app.use(express.json());

  // Media-server (LiveKit) accessed only via the integration abstraction (NFR20).
  const media = getMediaServer(loadEnv());

  // Identity (Story 2.2/2.3). Verifier + service are injectable for tests.
  const env = loadEnv();
  const verifier = deps.verifier ?? new CognitoTokenVerifier();
  const directory =
    env.CARAOKE_INTEGRATIONS === 'live' ? new CognitoUserDirectory() : new NoopUserDirectory();
  const identityService =
    deps.identityService ?? new IdentityService(new PgUserRepository(), directory);
  // Notifications (Story 3.5): localized to the recipient's profile language.
  const notificationService =
    deps.notificationService ??
    new NotificationService(new PgPushTokenRepository(), getPushSender(env), {
      getLanguage: (id) => identityService.getById(id).then((u) => u?.languagePref ?? null),
    }, env.APP_SCHEME);
  const spotifyService =
    deps.spotifyService ??
    new SpotifyService(getSpotifyProvider(env), new PgSpotifyLinkRepository());
  const pairingService =
    deps.pairingService ??
    new PairingService(new PgSessionRepository(), {
      inviteBaseUrl: env.INVITE_BASE_URL,
      ttlMinutes: env.SESSION_INVITE_TTL_MINUTES,
    });
  const savedPartnerService =
    deps.savedPartnerService ??
    new SavedPartnerService(new PgSavedPartnerRepository(), pairingService, notificationService);
  const readyService =
    deps.readyService ??
    new SessionReadyService(
      new PgSessionRepository(),
      getEventPublisher(env),
      undefined,
      notificationService,
    );

  // Liveness/readiness probe for ECS Express health checks.
  app.get('/health', (_req, res) => {
    res.json(ok({ status: 'ok', service: 'caraoke-api' }));
  });

  // Live-voice plane reachability (Story 1.5): reports the SFU health via the abstraction.
  app.get('/health/livekit', (_req, res, next) => {
    media
      .health()
      .then((health) => {
        res.status(health.healthy ? 200 : 503).json(ok({ ...health, url: media.signalingUrl() }));
      })
      .catch(next);
  });

  // Identity routes (FR1).
  app.use('/', createIdentityRouter({ service: identityService, verifier, spotifyService }));

  // Pairing routes (FR7, FR8, FR9).
  app.use(
    '/',
    createPairingRouter({
      verifier,
      identityService,
      pairingService,
      savedPartnerService,
      readyService,
    }),
  );

  // Notification routes (FR11).
  app.use('/', createNotificationRouter({ verifier, identityService, notificationService }));

  // Error envelope middleware MUST be last.
  app.use(errorHandler);

  return app;
}
