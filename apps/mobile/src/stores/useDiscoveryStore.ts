import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// Discoverability is opt-in only — off by default (FR27). The preference survives app restarts
// via SecureStore; the initial value is always false until hydrate() resolves.

const PREF_KEY = 'caraoke.discoverabilityEnabled';

interface DiscoveryState {
  discoverabilityEnabled: boolean;
  hydrated: boolean;
  setDiscoverable: (enabled: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  discoverabilityEnabled: false,
  hydrated: false,

  setDiscoverable: (enabled) => {
    set({ discoverabilityEnabled: enabled });
    SecureStore.setItemAsync(PREF_KEY, enabled ? '1' : '0').catch(() => {});
  },

  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(PREF_KEY);
    set({ discoverabilityEnabled: stored === '1', hydrated: true });
  },
}));
