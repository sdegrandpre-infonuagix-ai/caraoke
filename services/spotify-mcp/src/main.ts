import { loadEnv } from './config/env.js';
import { loadSpotifyCredentials } from './credentials.js';
import { LiveSpotifyController, MockSpotifyController } from './spotify/index.js';
import type { SpotifyController } from './spotify/index.js';
import { createHttpApp } from './server.js';

async function main(): Promise<void> {
  const env = loadEnv();

  // Validate credentials are resolvable at boot (fail fast); never hard-coded (NFR7).
  await loadSpotifyCredentials(env);

  const controller: SpotifyController =
    env.CARAOKE_INTEGRATIONS === 'live'
      ? new LiveSpotifyController()
      : new MockSpotifyController();

  const app = createHttpApp(controller);
  app.listen(env.PORT, () => {
    console.warn(
      `[spotify-mcp] listening on :${env.PORT} (${env.NODE_ENV}, integrations=${env.CARAOKE_INTEGRATIONS})`,
    );
  });
}

void main();
