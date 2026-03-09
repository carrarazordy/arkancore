import { create } from "zustand";

interface Metrics {
  cpu: number;
  ram: number;
}

interface HardwareMetricsState {
  metrics: Metrics;
  updateMetrics: () => void;
}

export const useHardwareMetrics = create<HardwareMetricsState>((set) => ({
  metrics: { cpu: 14, ram: 4.2 },
  updateMetrics: () => {
    set({
      metrics: {
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Number((Math.random() * 2 + 3).toFixed(1))
      }
    });
  },
}));
