import { create } from "zustand";

interface ChronosState {
  uptime: number;
  heartbeatMs: number;
  cpuUsage: number;
  memUsage: string;
  netSpeed: string;
  tick: () => void;
}

export const useChronosStore = create<ChronosState>((set) => ({
  uptime: Date.now(),
  heartbeatMs: 53,
  cpuUsage: 14,
  memUsage: "4.2GB",
  netSpeed: "420MB/S",
  tick: () => {
    set((state) => ({
      uptime: state.uptime, // Handled by the interval in AppShell usually, but let's keep it simple
      heartbeatMs: 50 + Math.random() * 10,
      cpuUsage: Math.floor(10 + Math.random() * 10),
    }));
  },
}));
