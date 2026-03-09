import { create } from "zustand";

interface DialogOptions {
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  hideInput?: boolean;
  onConfirm: (val?: string) => void | Promise<void>;
}

interface DialogState {
  isOpen: boolean;
  options: DialogOptions | null;
  openDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  options: null,
  openDialog: (options) => set({ isOpen: true, options }),
  closeDialog: () => set({ isOpen: false, options: null }),
}));
