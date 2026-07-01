import { sonicNative, type NativeSonicModule } from './nativeBridge';

/**
 * AmbientPresence — a subtle, continuous bed that conveys the partner is there, especially
 * while the screen is true-black in driving mode (UX-DR3/UX-DR5). It is the lowest-priority
 * layer and ducks under everything else.
 */
export class AmbientPresence {
  private active = false;

  constructor(private readonly native: NativeSonicModule = sonicNative) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    this.native.startAmbient();
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.native.stopAmbient();
  }

  isActive(): boolean {
    return this.active;
  }
}
