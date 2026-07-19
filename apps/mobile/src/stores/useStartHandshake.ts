import { create } from 'zustand';

/**
 * The "Start singing" gate (front of the synchronized start). The host picks a song → both phones
 * show it and must tap "Start singing" before the countdown begins, so no one starts alone.
 *
 * State is driven from two places: the AppSync `song.proposed` event (both phones, via
 * useStartHandshakeEvents) and the host's own request success (optimistically, so it doesn't wait
 * for the round-trip echo). It's cleared when `playback.scheduled` arrives — useScheduledStart's
 * countdown takes over from there.
 */

export interface ProposedTrack {
  trackUri: string;
  trackName: string;
  artist: string;
  trackId?: string;
}

interface StartHandshakeStore {
  proposedTrack: ProposedTrack | null;
  /** True once THIS device has tapped Start singing (waiting on the partner). */
  iConfirmed: boolean;
  /** A new song was picked — show it and reset confirmations. */
  propose: (track: ProposedTrack) => void;
  /** This device tapped Start singing. */
  setConfirmed: () => void;
  /** Handshake done or abandoned (playback scheduled, or session ended). */
  clear: () => void;
}

export const useStartHandshake = create<StartHandshakeStore>((set) => ({
  proposedTrack: null,
  iConfirmed: false,
  propose: (track) => set({ proposedTrack: track, iConfirmed: false }),
  setConfirmed: () => set({ iConfirmed: true }),
  clear: () => set({ proposedTrack: null, iConfirmed: false }),
}));
