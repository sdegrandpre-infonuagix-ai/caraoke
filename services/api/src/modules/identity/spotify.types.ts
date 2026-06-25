/** A stored Spotify link for a user (camelCase). */
export interface SpotifyLink {
  userId: string;
  spotifyUserId: string;
  product: string;
  isPremium: boolean;
  displayName: string | null;
  linkedAt: string;
  updatedAt: string;
}

/** Public link status returned to clients (never exposes tokens). */
export interface SpotifyLinkStatus {
  linked: boolean;
  isPremium: boolean;
  product: string | null;
  spotifyUserId: string | null;
  displayName: string | null;
}

export function toStatus(link: SpotifyLink | null): SpotifyLinkStatus {
  if (!link) {
    return { linked: false, isPremium: false, product: null, spotifyUserId: null, displayName: null };
  }
  return {
    linked: true,
    isPremium: link.isPremium,
    product: link.product,
    spotifyUserId: link.spotifyUserId,
    displayName: link.displayName,
  };
}
