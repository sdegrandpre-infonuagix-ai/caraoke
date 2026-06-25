import { apiFetch } from './client';

/** Register this device's push token for the signed-in user (FR11). */
export function registerPushToken(
  idToken: string,
  token: string,
  platform: 'ios' | 'android',
): Promise<{ registered: boolean }> {
  return apiFetch('/push-tokens', {
    method: 'POST',
    token: idToken,
    body: { token, platform },
  });
}
