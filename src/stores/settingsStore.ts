import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  halalOnly: boolean;
  selectedCity: string;
  toggleHalalOnly: () => void;
  setCity: (city: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      halalOnly: false,
      selectedCity: 'Kuala Lumpur',
      toggleHalalOnly: () => set(s => ({ halalOnly: !s.halalOnly })),
      setCity: (city) => set({ selectedCity: city }),
    }),
    {
      name: 'rasa-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
