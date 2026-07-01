// Nearby-singer intent classifier (Story 5.4, FR28/UX-DR8).
// Local keyword classification — same pattern as playbackIntent (Story 4.6). No network call;
// these phrases are unambiguous enough for on-device matching, keeping the response instant.

import type { NearbyUser } from '../api/discovery';

const NEARBY_PATTERNS = [
  /\bany\s+caraokes?\s+nearby\b/i,
  /\bwho(?:'s|\s+is)\s+(?:singing\s+)?nearby\b/i,
  /\bany(?:one|body)\s+(?:near(?:by)?|close|around)\b/i,
  /\bnearby\s+singers?\b/i,
  /\bfind\s+(?:me\s+)?(?:someone|a\s+singer)\s+(?:near|nearby|close)\b/i,
  /\bwho(?:'s|\s+is)\s+near\s+me\b/i,
  /\bany\s+singers?\s+near\b/i,
  /\bsomeone\s+(?:near|nearby|close)\b/i,
];

/** True when the transcript is a "who's nearby?" type query. */
export function classifyNearbyIntent(transcript: string): boolean {
  return NEARBY_PATTERNS.some((p) => p.test(transcript));
}

/**
 * Build Riff's spoken response for a nearby-query result.
 * Empty pool uses a warm, inviting framing (UX-DR8: never "0 found").
 */
export function buildNearbyResponse(users: NearbyUser[]): string {
  if (users.length === 0) {
    return "No one's singing nearby just yet — but you're setting the stage. Keep discovery on and they'll find you.";
  }
  if (users.length === 1) {
    const name = users[0]!.displayName;
    return `There's one singer nearby: ${name}. Say "connect with ${name}" to start a duet.`;
  }
  const names = users.map((u) => u.displayName);
  const last = names.pop()!;
  const list = names.length === 1 ? `${names[0]} and ${last}` : `${names.join(', ')}, and ${last}`;
  return `There are ${users.length} singers nearby: ${list}. Say a name to connect.`;
}
