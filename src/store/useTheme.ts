import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AccentTheme = "yellow" | "green" | "red" | "purple" | "orange" | "cyan" | "white";

interface ThemeState {
  theme: AccentTheme;
  setTheme: (theme: AccentTheme) => void;
}

export const THEME_SWATCHES: Record<AccentTheme, string> = {
  yellow: "#ffff00",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
  cyan: "#22d3ee",
  white: "#f5f5f5",
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "yellow",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "arkan-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
