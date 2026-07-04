import express, { type Express } from 'express';
import { ok } from '@caraoke/shared';
import { errorHandler } from './middleware/errorHandler.js';
import { loadEnv } from './config/env.js';
import { getMediaServer } from './integrations/media/index.js';
import { CognitoTokenVerifier, type TokenVerifier } from './middleware/auth.js';
import { PgUserRepository } from './modules/identity/identity.repository.js';
import { IdentityService } from './modules/identity/identity.service.js';
import { createIdentityRouter } from './modules/identity/identity.router.js';
import { createIdentityAdminRouter } from './modules/identity/identity.admin.router.js';
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
import { getStripeIdentityProvider } from './integrations/stripe/index.js';
import { AgeVerificationService } from './modules/ageVerification/ageVerification.service.js';
import { createAgeVerificationRouter } from './modules/ageVerification/ageVerification.router.js';
import { getRedisStore } from './integrations/redis/index.js';
import { DiscoveryService } from './modules/discovery/discovery.service.js';
import { createDiscoveryRouter } from './modules/discovery/discovery.router.js';
import { PgModerationRepository } from './modules/moderation/moderation.repository.js';
import { ModerationService } from './modules/moderation/moderation.service.js';
import { createModerationRouter } from './modules/moderation/moderation.router.js';
import { PgBillingRepository } from './modules/billing/billing.repository.js';
import { BillingService } from './modules/billing/billing.service.js';
import { createBillingRouter } from './modules/billing/billing.router.js';
import { createBillingWebhookRouter } from './modules/billing/billing.webhook.router.js';
import { createBillingAdminRouter } from './modules/billing/billing.admin.router.js';
import { createBillingRevenueRouter } from './modules/billing/billing.revenue.router.js';
import { getStripeBillingProvider } from './integrations/stripe/billing.provider.js';
import { getFirehoseClient } from './integrations/firehose/index.js';
import { TelemetryService } from './modules/telemetry/telemetry.service.js';
import { createTelemetryRouter } from './modules/telemetry/telemetry.router.js';
import { PgTelemetryRepository } from './modules/telemetry/telemetry.repository.js';
import { createTelemetryAdminRouter } from './modules/telemetry/telemetry.admin.router.js';
import { sensitiveLimiter, adminLimiter } from './middleware/rateLimit.js';
import { AgentService } from './modules/agent/agent.service.js';
import { AppSyncScheduledStartProducer } from './modules/agent/scheduledStart.js';
import { createAgentRouter } from './modules/agent/agent.router.js';
import { getSpotifySearchProvider } from './integrations/spotify/search.js';
import { LivePlaybackPositionService, type PlaybackPositionService } from './modules/agent/playback.service.js';
import { createPlaybackRouter } from './modules/agent/playback.router.js';
import { getPlaybackPositionProvider } from './integrations/spotify/playback.js';

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
  /** Override the agent service (tests). Defaults to Spotify-search + NullScheduledStartProducer. */
  agentService?: AgentService;
  /** Override the playback-position service (tests). Defaults to live Spotify polling. */
  playbackPositionService?: PlaybackPositionService;
}

/**
 * Build the Express app (architecture: modular monolith bootstrap).
 * Domain module routers (identity, pairing, session, ...) mount here in later epics.
 */
export function createApp(deps: AppDeps = {}): Express {
  const app = express();

  // Behind the ECS Express gateway / ALB (one proxy hop): trust a single X-Forwarded-For hop so
  // req.ip is the real client for rate limiting, without trusting a spoofable full chain.
  app.set('trust proxy', 1);

  // Stripe webhook — must be mounted BEFORE express.json() (raw body required for sig verification).
  const billingRepo = new PgBillingRepository();
  app.use(
    '/',
    createBillingWebhookRouter({ repo: billingRepo, webhookSecret: loadEnv().STRIPE_WEBHOOK_SECRET }),
  );

  app.use(express.json());

  // Per-IP rate limits on the expensive / security-sensitive surfaces (registered before the
  // routers so they run first). Money + identity mutations and the admin-key routes are the
  // abuse-worthy targets; everything else stays unthrottled.
  app.use('/billing/subscribe', sensitiveLimiter());
  app.use('/billing/setup-intent', sensitiveLimiter());
  app.use('/age-verification/session', sensitiveLimiter());
  app.use('/admin', adminLimiter());

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
  // Moderation (Story 6.1): instantiate early so pairingService can use it as a blockChecker.
  const moderationService = new ModerationService(new PgModerationRepository());

  const pairingService =
    deps.pairingService ??
    new PairingService(new PgSessionRepository(), {
      inviteBaseUrl: env.INVITE_BASE_URL,
      ttlMinutes: env.SESSION_INVITE_TTL_MINUTES,
      blockChecker: moderationService,
    });
  const savedPartnerService =
    deps.savedPartnerService ??
    new SavedPartnerService(
      new PgSavedPartnerRepository(),
      pairingService,
      notificationService,
      moderationService,
    );
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

  // Android App Links: verifies https://api.caraoke.ai/{auth,spotify}/callback deep-links open
  // the app (used for the OAuth return instead of a custom scheme, which Chrome blocks). The
  // SHA-256 is the EAS-managed signing cert for ai.caraoke.app. Served as a bare JSON array.
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'ai.caraoke.app',
          sha256_cert_fingerprints: [
            '9B:9B:2A:52:87:B7:BF:62:1D:19:D3:74:C1:4A:01:EB:E1:5E:68:E7:18:69:0B:CE:12:C8:0D:B2:C2:39:C3:EB',
          ],
        },
      },
    ]);
  });

  // Clock-sync primitive (Story 3.6, AR10/NFR1): server time for the client's offset
  // exchange. Read at the latest possible moment to minimize asymmetric delay.
  app.get('/time', (_req, res) => {
    res.json(ok({ serverTime: Date.now() }));
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
  // Account administration routes (Story 8.7, FR48).
  app.use('/', createIdentityAdminRouter({ repo: new PgUserRepository() }));

  // Pairing routes (FR7, FR8, FR9).
  app.use(
    '/',
    createPairingRouter({
      verifier,
      identityService,
      pairingService,
      savedPartnerService,
      readyService,
      mediaServer: media,
    }),
  );

  // Notification routes (FR11).
  app.use('/', createNotificationRouter({ verifier, identityService, notificationService }));

  // Age-verification routes (Story 5.2, FR32).
  const ageVerificationService = new AgeVerificationService(getStripeIdentityProvider(env));
  app.use('/', createAgeVerificationRouter({ verifier, service: ageVerificationService }));

  // Discovery routes (Story 5.3/5.4/5.5, FR28/FR29/FR30/FR31).
  // blockChecker hides blocked users from nearby results and blocks connecting to them (FR33).
  const discoveryService = new DiscoveryService(getRedisStore(env), moderationService);
  app.use('/', createDiscoveryRouter({ verifier, service: discoveryService, identityService, savedPartnerService }));

  // Moderation routes (Story 6.1, FR33): block + report (moderationService already instantiated above).
  app.use('/', createModerationRouter({ verifier, service: moderationService, identityService }));

  // Billing routes (Story 7.1–7.3, FR38/FR41/NFR7): reuse billingRepo created above for webhook.
  const billingService = new BillingService(
    billingRepo,
    getStripeBillingProvider(env),
    env.STRIPE_PRICE_ID,
    env.STRIPE_ALLOWED_PRICE_IDS
      ? env.STRIPE_ALLOWED_PRICE_IDS.split(',').map((s) => s.trim()).filter(Boolean)
      : [env.STRIPE_PRICE_ID],
  );
  app.use('/', createBillingRouter({ verifier, service: billingService, identityService }));
  app.use('/', createBillingAdminRouter({ repo: billingRepo, stripe: getStripeBillingProvider(env) }));
  app.use('/', createBillingRevenueRouter({ repo: billingRepo, monthlyPriceCents: env.STRIPE_MONTHLY_PRICE_CENTS }));

  // Telemetry routes (Story 8.1/8.2, FR42/FR43/AR7): session-health + felt-together.
  const telemetryService = new TelemetryService(getFirehoseClient(env), new PgTelemetryRepository());
  app.use(
    '/',
    createTelemetryRouter({
      verifier,
      service: telemetryService,
      identityService,
      // Telemetry writers must be participants of the session they report on.
      participantGuard: pairingService,
    }),
  );
  app.use('/', createTelemetryAdminRouter({ service: telemetryService }));

  // Voice-agent routes (Story 9.1/9.2): song requests — participant-gated, Spotify track
  // resolution, and playback.scheduled event publishing (Story 9.2).
  const agentService =
    deps.agentService ??
    new AgentService(
      pairingService,
      getSpotifySearchProvider(env),
      new AppSyncScheduledStartProducer(getEventPublisher(env)),
    );
  app.use('/', createAgentRouter({ verifier, identityService, agentService }));

  // Playback position route (Story 9.4): supplies the real Spotify position for drift correction.
  const playbackPositionService =
    deps.playbackPositionService ??
    new LivePlaybackPositionService(
      pairingService,
      new PgSpotifyLinkRepository(),
      getPlaybackPositionProvider(env),
    );
  app.use('/', createPlaybackRouter({ verifier, identityService, positionService: playbackPositionService }));

  // Error envelope middleware MUST be last.
  app.use(errorHandler);

  return app;
}
