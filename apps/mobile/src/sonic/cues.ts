import type { SessionState } from '@caraoke/shared';

/**
 * Sonic cue per session state (UX-DR2/UX-DR4). The SonicEngine plays the mapped cue whenever
 * the SessionStateMachine enters a new state, so the eyes-free experience is consistent with
 * the visual layer (both subscribe to the same machine). `null` = no cue for that state.
 */
export const STATE_CUES: Record<SessionState, string | null> = {
  idle: null,
  pairing: 'cue.pairing',
  ready: 'cue.ready',
  playing: 'cue.start',
  reconnecting: 'cue.reconnecting',
  ended: 'cue.ended',
};

export function cueForState(state: SessionState): string | null {
  return STATE_CUES[state];
}
