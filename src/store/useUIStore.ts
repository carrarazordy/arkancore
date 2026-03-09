import { create } from "zustand";

interface UIState {
  isNewProjectModalOpen: boolean;
  setIsNewProjectModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNewProjectModalOpen: false,
  setIsNewProjectModalOpen: (open: boolean) => set({ isNewProjectModalOpen: open }),
}));
