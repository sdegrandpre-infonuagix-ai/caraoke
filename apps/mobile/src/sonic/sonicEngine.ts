import type { SessionState } from '@caraoke/shared';
import { sonicNative, type NativeSonicModule } from './nativeBridge';
import { cueForState } from './cues';
import { AudioDucking } from './audioDucking';
import { RiffVoice } from './riffVoice';
import { AmbientPresence } from './ambientPresence';

/**
 * SonicEngine (UX-DR3) — the conductor of the sonic layer. It owns the AudioDucking, RiffVoice,
 * and AmbientPresence services and subscribes to the SessionStateMachine: on each state change
 * it plays the mapped cue (UX-DR2/UX-DR4), keeping audio feedback consistent with the visuals.
 */
export class SonicEngine {
  readonly ducking: AudioDucking;
  readonly riff: RiffVoice;
  readonly ambient: AmbientPresence;

  constructor(private readonly native: NativeSonicModule = sonicNative) {
    this.ducking = new AudioDucking(native);
    this.riff = new RiffVoice(this.ducking, native);
    this.ambient = new AmbientPresence(native);
  }

  /** Play the cue for a state transition (called by the machine subscription). */
  onState(state: SessionState): void {
    const cue = cueForState(state);
    if (cue) this.native.playCue(cue);
    // Ambient presence runs while a session is live; silent when idle/ended.
    if (state === 'idle' || state === 'ended') this.ambient.stop();
    else this.ambient.start();
  }
}

/** Singleton SonicEngine for the app. */
export const sonicEngine = new SonicEngine();
