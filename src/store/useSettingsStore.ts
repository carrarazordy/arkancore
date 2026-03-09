import { create } from "zustand";

interface SettingsState {
  audioLevels: any;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  audioLevels: { master: 0.5, sfx: 0.8, ambient: 0.2 },
}));
