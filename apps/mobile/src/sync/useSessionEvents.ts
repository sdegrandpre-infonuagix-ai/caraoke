// Story 9.3: wire the SessionStateMachine to the real AppSync event stream.
// Defect closed: the machine previously stayed at 'idle' because nothing called
// transition() in response to domain events from the server.
//
// The pure `handleDomainEvent` function is the testable core — the React hook
// is thin glue that connects `subscribeSessionEvents` to the Zustand store.

import { useEffect } from 'react';
import type { SessionState } from '@caraoke/shared';
import { useSessionMachine } from '../stores/useSessionMachine.js';
import { subscribeSessionEvents, type AnyDomainEvent } from './appSyncEvents.js';

/**
 * Map a domain event to a SessionStateMachine transition.
 *
 * Returns true when the transition was applied (or was a no-op same-state call),
 * false when the event type is unknown or the transition is illegal for the current state.
 * Extracted as a pure function so it can be unit-tested without React or a live socket.
 */
export function handleDomainEvent(
  event: AnyDomainEvent,
  transition: (to: SessionState) => boolean,
): boolean {
  switch (event.type) {
    // Server confirms both participants are ready → start the countdown.
    case 'partner.ready':
      return transition('ready');

    // Agent scheduled playback at T → both clients must be in 'playing' to start the timer.
    case 'playback.scheduled':
      return transition('playing');

    // Drift or LiveKit disconnect detected → hold state until resync.
    case 'session.reconnecting':
      return transition('reconnecting');

    // Session explicitly ended (host left, server cleanup, etc.).
    case 'session.ended':
      return transition('ended');

    // Unknown event types are forwarded without side effects; caller can inspect them.
    default:
      return false;
  }
}

/**
 * Subscribe to AppSync session events and drive the SessionStateMachine accordingly.
 * Cleans up the WebSocket subscription when the component unmounts or sessionId changes.
 *
 * Wire-up:
 *   partner.ready        → 'ready'        (pairing → ready)
 *   playback.scheduled   → 'playing'      (ready → playing)
 *   session.reconnecting → 'reconnecting' (playing → reconnecting)
 *   session.ended        → 'ended'        (any → ended)
 */
export function useSessionEvents(sessionId: string): void {
  useEffect(() => {
    return subscribeSessionEvents(sessionId, (event) => {
      handleDomainEvent(event, useSessionMachine.getState().transition);
    });
  }, [sessionId]);
}
