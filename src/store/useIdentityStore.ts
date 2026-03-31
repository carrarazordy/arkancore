import { create } from "zustand";
import { terminateAuthSession } from "@/lib/auth";

interface IdentityState {
  terminateSession: (scope?: "current" | "all") => Promise<void>;
}

export const useIdentityStore = create<IdentityState>(() => ({
  terminateSession: async (scope = "current") => {
    await terminateAuthSession(scope);
  },
}));
