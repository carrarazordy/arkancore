import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface IdentityState {
  terminateSession: (scope?: "current" | "all") => Promise<void>;
}

export const useIdentityStore = create<IdentityState>(() => ({
  terminateSession: async (scope = "current") => {
    const { error } = await supabase.auth.signOut({
      scope: scope === "all" ? "global" : "local",
    });

    if (error) {
      throw error;
    }
  },
}));
