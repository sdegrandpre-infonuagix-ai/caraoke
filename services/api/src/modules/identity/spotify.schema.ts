import { z } from 'zod';

/** Body for linking Spotify — the access token (from the mobile OAuth flow) + optional
 * refresh token to persist for later playback control. */
export const linkSpotifySchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
});

export type LinkSpotifyInput = z.infer<typeof linkSpotifySchema>;
