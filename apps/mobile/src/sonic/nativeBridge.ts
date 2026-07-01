// Native sonic bridge (Story 4.2, UX-DR3). The latency-critical audio lives in a LOCAL Expo
// Module (Swift/Kotlin) named "CaraokeAudio"; the TS facades call it through this typed bridge.
// Until that native module ships, a JS fallback keeps the app running (no audio, no crash) so
// the facades, state-machine wiring, and ducking logic are exercised end-to-end on any build.

import { requireOptionalNativeModule } from 'expo-modules-core';
import type { SoundLayer } from './ducking';

/** The native module contract the Swift/Kotlin implementation fulfils. */
export interface NativeSonicModule {
  /** Play a one-shot UI/state cue by name. */
  playCue(name: string): void;
  /** Set per-layer gains (dB) immediately. */
  setGains(gains: Record<SoundLayer, number>): void;
  /** Ramp every layer back toward 0dB over `durationMs` (the duck-restore). */
  restore(durationMs: number): void;
  /** Speak text via on-device TTS in the given BCP-47 language (RiffVoice). */
  speak(text: string, language: string): void;
  /** Start/stop the subtle ambient-presence bed. */
  startAmbient(): void;
  stopAmbient(): void;
}

/** JS fallback used when the native module isn't present (dev client not yet built). */
class FallbackSonicModule implements NativeSonicModule {
  playCue(_name: string): void {}
  setGains(_gains: Record<SoundLayer, number>): void {}
  restore(_durationMs: number): void {}
  speak(_text: string, _language: string): void {}
  startAmbient(): void {}
  stopAmbient(): void {}
}

const native = requireOptionalNativeModule<NativeSonicModule>('CaraokeAudio');

/** The active sonic backend — the real native module if linked, else the JS fallback. */
export const sonicNative: NativeSonicModule = native ?? new FallbackSonicModule();

/** True when the real native audio module is linked. */
export const hasNativeSonic = native != null;
