// Sonic services (Story 4.2). Public surface + the wiring that subscribes the sonic layer to
// the SessionStateMachine (UX-DR2): both visual and sonic feedback react to the same source.
import { useSessionMachine } from '../stores/useSessionMachine';
import { sonicEngine } from './sonicEngine';

export { sonicEngine } from './sonicEngine';
export { SonicEngine } from './sonicEngine';
export { AudioDucking } from './audioDucking';
export { RiffVoice } from './riffVoice';
export { AmbientPresence } from './ambientPresence';
export { hasNativeSonic } from './nativeBridge';

/**
 * Subscribe the SonicEngine to the SessionStateMachine. Idempotent — returns the unsubscribe.
 * Fires once for the current state so audio matches the machine immediately.
 */
export function attachSonicEngine(): () => void {
  sonicEngine.onState(useSessionMachine.getState().state);
  return useSessionMachine.subscribe((s, prev) => {
    if (s.state !== prev.state) sonicEngine.onState(s.state);
  });
}
