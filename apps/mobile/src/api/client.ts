import type { ApiResponse } from '@caraoke/shared';
import { authConfig } from '../auth/config';

/**
 * Thin API client returning the uniform `{ data, error }` envelope. Unwraps to the data or
 * throws on the error envelope so TanStack Query surfaces it as a query error.
 */
export async function apiFetch<T>(
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${authConfig.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (json.error) throw new Error(json.error.message);
  return json.data as T;
}
