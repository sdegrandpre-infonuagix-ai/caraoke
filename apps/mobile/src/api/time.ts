import { apiFetch } from './client';

/** Fetch the server's current epoch-ms (clock-sync exchange, Story 3.6). Unauthenticated. */
export function fetchServerTime(): Promise<{ serverTime: number }> {
  return apiFetch<{ serverTime: number }>('/time');
}
