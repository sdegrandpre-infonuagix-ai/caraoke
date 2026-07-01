import { sonicNative, type NativeSonicModule } from './nativeBridge';
import type { AudioDucking } from './audioDucking';

/**
 * RiffVoice — the Voice Agent's speech (UX-DR3). Speaking ducks the other layers (UX-DR10)
 * for the duration, then restores. Language is the user's profile language (FR4); the native
 * module performs on-device TTS. The Story 4.9 follow-up window lives on top of this.
 */
export class RiffVoice {
  constructor(
    private readonly ducking: AudioDucking,
    private readonly native: NativeSonicModule = sonicNative,
  ) {}

  /** Speak `text` in `language` (BCP-47), ducking other audio while it plays. */
  speak(text: string, language: string): void {
    this.ducking.duck();
    this.native.speak(text, language);
  }

  /** Called when speech completes (native event) to release the duck. */
  onSpeechEnded(): void {
    this.ducking.restore();
  }
}
