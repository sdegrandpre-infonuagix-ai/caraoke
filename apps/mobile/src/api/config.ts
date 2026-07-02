import { authConfig } from '../auth/config';

/**
 * Base URL for direct `fetch` calls (billing uses raw fetch rather than the apiFetch envelope
 * helper). Sourced from the same auth config the rest of the app uses so there's one source of
 * truth for the API host.
 */
export const API_BASE = authConfig.apiBaseUrl;
