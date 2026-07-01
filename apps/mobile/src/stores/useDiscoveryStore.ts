import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AgeVerificationResult } from '../ageVerification/types';

// Discoverability is opt-in only — off by default (FR27). Age-verification is one-time
// and gates discovery: only is18Plus === true users can enable being discoverable (FR32).
// Only { is18Plus, verificationRef } are persisted — never the ID document (NFR11).

const KEYS = {
  enabled: 'caraoke.discoverabilityEnabled',
  is18Plus: 'caraoke.is18Plus',
  verificationRef: 'caraoke.verificationRef',
} as const;

interface DiscoveryState {
  discoverabilityEnabled: boolean;
  is18Plus: boolean | null;
  verificationRef: string | null;
  hydrated: boolean;
  setDiscoverable: (enabled: boolean) => void;
  setAgeVerified: (result: AgeVerificationResult) => void;
  hydrate: () => Promise<void>;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  discoverabilityEnabled: false,
  is18Plus: null,
  verificationRef: null,
  hydrated: false,

  setDiscoverable: (enabled) => {
    set({ discoverabilityEnabled: enabled });
    SecureStore.setItemAsync(KEYS.enabled, enabled ? '1' : '0').catch(() => {});
  },

  setAgeVerified: ({ is18Plus, verificationRef }) => {
    set({ is18Plus, verificationRef });
    SecureStore.setItemAsync(KEYS.is18Plus, is18Plus ? '1' : '0').catch(() => {});
    SecureStore.setItemAsync(KEYS.verificationRef, verificationRef).catch(() => {});
  },

  hydrate: async () => {
    const [enabled, ageRaw, ref] = await Promise.all([
      SecureStore.getItemAsync(KEYS.enabled),
      SecureStore.getItemAsync(KEYS.is18Plus),
      SecureStore.getItemAsync(KEYS.verificationRef),
    ]);
    set({
      discoverabilityEnabled: enabled === '1',
      is18Plus: ageRaw === null ? null : ageRaw === '1',
      verificationRef: ref ?? null,
      hydrated: true,
    });
  },
}));
