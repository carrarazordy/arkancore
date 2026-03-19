import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AudioLevels {
  master: number;
  keyboard: number;
  confirmation: number;
  ambient: number;
}

export interface SettingsSnapshot {
  audioLevels: AudioLevels;
  timezone: string;
  syncActive: boolean;
  lastBackupAt: string | null;
  version: string;
  buildNode: string;
}

interface SettingsState extends SettingsSnapshot {
  setAudioLevel: (key: keyof AudioLevels, value: number) => void;
  setTimezone: (timezone: string) => void;
  toggleSync: () => void;
  markBackup: () => void;
  importSnapshot: (snapshot: Partial<SettingsSnapshot>) => void;
  resetSettings: () => void;
}

export const DEFAULT_AUDIO_LEVELS: AudioLevels = {
  master: 0.85,
  keyboard: 0.4,
  confirmation: 1,
  ambient: 0.15,
};

export const DEFAULT_SETTINGS_SNAPSHOT: SettingsSnapshot = {
  audioLevels: DEFAULT_AUDIO_LEVELS,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  syncActive: true,
  lastBackupAt: null,
  version: "V4.0.2_BETA",
  buildNode: "ARKAN_MAIN_01",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS_SNAPSHOT,
      setAudioLevel: (key, value) =>
        set((state) => ({
          audioLevels: {
            ...state.audioLevels,
            [key]: Math.max(0, Math.min(1, value)),
          },
        })),
      setTimezone: (timezone) => set({ timezone }),
      toggleSync: () => set((state) => ({ syncActive: !state.syncActive })),
      markBackup: () => set({ lastBackupAt: new Date().toISOString() }),
      importSnapshot: (snapshot) =>
        set((state) => ({
          audioLevels: {
            ...state.audioLevels,
            ...(snapshot.audioLevels ?? {}),
          },
          timezone: snapshot.timezone ?? state.timezone,
          syncActive: snapshot.syncActive ?? state.syncActive,
          lastBackupAt: snapshot.lastBackupAt ?? state.lastBackupAt,
          version: snapshot.version ?? state.version,
          buildNode: snapshot.buildNode ?? state.buildNode,
        })),
      resetSettings: () => set(() => ({ ...DEFAULT_SETTINGS_SNAPSHOT, audioLevels: { ...DEFAULT_AUDIO_LEVELS } })),
    }),
    {
      name: "arkan-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

