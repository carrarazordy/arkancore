import { create } from "zustand";

export interface Log {
  id: string;
  message: string;
  type: string;
  timestamp: string;
}

interface SystemLogState {
  logs: Log[];
  addLog: (message: string, type: string) => void;
}

export const useSystemLogStore = create<SystemLogState>((set) => ({
  logs: [
    { id: "1", message: "SYSTEM_INITIALIZED", type: "status", timestamp: new Date().toLocaleTimeString() }
  ],
  addLog: (message, type) => set((state) => ({
    logs: [{ id: Math.random().toString(), message, type, timestamp: new Date().toLocaleTimeString() }, ...state.logs].slice(0, 50)
  })),
}));
