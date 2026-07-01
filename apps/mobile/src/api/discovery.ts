import { apiFetch } from './client';

export interface NearbyUser {
  userId: string;
  displayName: string;
  plusCode: string;
}

/** Publish the caller's coarse Plus Code area so nearby users can find them (FR29). */
export function publishLocation(idToken: string, plusCode: string): Promise<void> {
  return apiFetch<void>('/discovery/location', {
    method: 'PUT',
    token: idToken,
    body: { plusCode },
  });
}

/** Remove the caller's location entry from Redis (called on discovery-off or sign-out). */
export function revokeLocation(idToken: string): Promise<void> {
  return apiFetch<void>('/discovery/location', {
    method: 'DELETE',
    token: idToken,
  });
}

/** Fetch discoverable users whose Plus Code area matches the given coarse code (Story 5.4). */
export function getNearbyUsers(idToken: string, plusCode: string): Promise<NearbyUser[]> {
  return apiFetch<NearbyUser[]>(
    `/discovery/nearby?plusCode=${encodeURIComponent(plusCode)}`,
    { token: idToken },
  );
}
