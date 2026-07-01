import { sonicNative, type NativeSonicModule } from './nativeBridge';
import { duckGains, DEFAULT_DUCK, type DuckConfig } from './ducking';

/**
 * AudioDucking service (UX-DR10). Ducks the backing track (~12dB) and partner voice (~6dB)
 * while the agent (Riff) speaks, and restores over 500ms when it stops. Delegates the actual
 * gain application to the native module; the level/curve math lives in ./ducking (tested).
 */
export class AudioDucking {
  private riffActive = false;

  constructor(
    private readonly native: NativeSonicModule = sonicNative,
    private readonly cfg: DuckConfig = DEFAULT_DUCK,
  ) {}

  /** Engage ducking (agent started speaking / a high-priority cue began). */
  duck(): void {
    this.riffActive = true;
    this.native.setGains(duckGains(true, this.cfg));
  }

  /** Release ducking and restore all layers over the configured ramp. */
  restore(): void {
    this.riffActive = false;
    this.native.setGains(duckGains(false, this.cfg));
    this.native.restore(this.cfg.restoreMs);
  }

  isDucked(): boolean {
    return this.riffActive;
  }
}
