import { createApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = createApp();

app.listen(env.API_PORT, () => {
  console.warn(`[api] caraoke-api listening on :${env.API_PORT} (${env.NODE_ENV})`);
});
