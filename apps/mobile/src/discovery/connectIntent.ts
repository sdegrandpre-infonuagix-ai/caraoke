// Nearby-connect intent classifier (Story 5.5, FR30/FR31).
// Recognises "connect with [name]" voice commands so the driver can add a nearby singer
// as a partner hands-free. Extracts the target name from the transcript for fuzzy matching
// against the last nearby-users list.

import type { NearbyUser } from '../api/discovery';

export interface ConnectMatch {
  matched: true;
  targetName: string;
}
export interface ConnectNoMatch {
  matched: false;
}
export type ConnectIntentResult = ConnectMatch | ConnectNoMatch;

// Each pattern must have a named capture group "name" for the target.
const CONNECT_PATTERNS: RegExp[] = [
  /\bconnect\s+with\s+(?<name>[a-z][\w\s]{0,39}?\b)/i,
  /\bsing\s+with\s+(?<name>[a-z][\w\s]{0,39}?\b)/i,
  /\bpair\s+with\s+(?<name>[a-z][\w\s]{0,39}?\b)/i,
  /\badd\s+(?<name>[a-z][\w\s]{0,39}?\b)(?:\s+as\s+(?:a\s+)?partner)?\b/i,
  /\bduet\s+with\s+(?<name>[a-z][\w\s]{0,39}?\b)/i,
];

/** Extract the target-name mention from a "connect with X" transcript, or return no-match. */
export function classifyConnectIntent(transcript: string): ConnectIntentResult {
  for (const pattern of CONNECT_PATTERNS) {
    const m = pattern.exec(transcript);
    if (m?.groups?.['name']) {
      return { matched: true, targetName: m.groups['name'].trim() };
    }
  }
  return { matched: false };
}

/**
 * Case-insensitive name lookup: exact first, then prefix, then substring.
 * Handles STT variations like "Alice" matching displayName "Alice C.".
 */
export function findByName(users: NearbyUser[], name: string): NearbyUser | undefined {
  const lower = name.toLowerCase();
  return (
    users.find((u) => u.displayName.toLowerCase() === lower) ??
    users.find((u) => u.displayName.toLowerCase().startsWith(lower)) ??
    users.find((u) => u.displayName.toLowerCase().includes(lower))
  );
}
