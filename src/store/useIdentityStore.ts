import { create } from "zustand";

interface IdentityState {
  terminateSession: (session: string) => Promise<void>;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  terminateSession: async () => {
    console.log("Session terminated");
  },
}));
