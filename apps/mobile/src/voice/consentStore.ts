import { create } from 'zustand';

/**
 * Explicit microphone consent (FR22). The voice plane never opens until the user grants this
 * in-app; it gates the OS mic permission + LiveKit publish. Persisted within the session run.
 */
interface ConsentState {
  micConsented: boolean;
  grantMic: () => void;
  revokeMic: () => void;
}

export const useMicConsent = create<ConsentState>((set) => ({
  micConsented: false,
  grantMic: () => set({ micConsented: true }),
  revokeMic: () => set({ micConsented: false }),
}));
