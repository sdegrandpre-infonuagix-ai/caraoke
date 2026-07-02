// Native sonic bridge (Story 4.2, UX-DR3). The latency-critical audio lives in a LOCAL Expo
// Module (Swift/Kotlin) named "CaraokeAudio"; the TS facades call it through this typed bridge.
// Until that native module ships, a JS fallback keeps the app running (no audio, no crash) so
// the facades, state-machine wiring, and ducking logic are exercised end-to-end on any build.

import { EventEmitter, requireOptionalNativeModule } from 'expo-modules-core';
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

// Story 9.5: EventEmitter wrapping the native module so JS can subscribe to `onSpeechEnded`.
// The emitter is null when running in a JS-only environment (e.g. unit tests, Expo Go without
// the custom dev client) — callers receive a no-op { remove } handle in that case.
const sonicEmitter = native ? new EventEmitter(native as Parameters<typeof EventEmitter>[0]) : null;

/** Subscription handle returned by addSpeechEndedListener. */
export interface SpeechEndedSubscription {
  remove(): void;
}

/**
 * Subscribe to the native `onSpeechEnded` event emitted when AVSpeechSynthesizer (iOS) or
 * UtteranceProgressListener (Android) reports that TTS playback has finished.
 * Returns a subscription object; call `.remove()` to unsubscribe.
 */
export function addSpeechEndedListener(handler: () => void): SpeechEndedSubscription {
  return sonicEmitter?.addListener('onSpeechEnded', handler) ?? { remove: () => {} };
}
