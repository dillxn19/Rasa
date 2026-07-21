import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  halalOnly: boolean;
  selectedCity: string;
  toggleHalalOnly: () => void;
  setHalalOnly: (value: boolean) => void;
  setCity: (city: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      halalOnly: false,
      selectedCity: 'Kuala Lumpur',
      toggleHalalOnly: () => set(s => ({ halalOnly: !s.halalOnly })),
      setHalalOnly: (value) => set({ halalOnly: value }),
      setCity: (city) => set({ selectedCity: city }),
    }),
    {
      name: 'rasa-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist city globally — halal is per-user, loaded on sign-in
      partialize: (state) => ({ selectedCity: state.selectedCity }),
    }
  )
);

export async function loadUserHalal(userId: string) {
  const val = await AsyncStorage.getItem(`rasa-halal-${userId}`);
  useSettingsStore.getState().setHalalOnly(val === 'true');
}

export async function saveUserHalal(userId: string, value: boolean) {
  await AsyncStorage.setItem(`rasa-halal-${userId}`, String(value));
}
