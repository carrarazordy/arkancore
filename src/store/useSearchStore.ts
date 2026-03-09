import { create } from "zustand";

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  description?: string;
  action?: string;
}

interface SearchState {
  query: string;
  setQuery: (query: string) => void;
  isOpen: boolean;
  toggleSearch: (open: boolean) => void;
  results: SearchResult[];
  executeSearch: (query: string) => void;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
  isOpen: false,
  toggleSearch: (isOpen) => set({ isOpen }),
  results: [],
  executeSearch: (query) => {
    if (!query) return set({ results: [] });
    // Mock search logic
    set({
      results: [
        { id: "1", title: "Dashboard", type: "COMMAND", action: "NAV_DASHBOARD" },
        { id: "2", title: "Set Theme Dark", type: "COMMAND", action: "SET_THEME_DARK" }
      ].filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
    });
  },
  clearResults: () => set({ results: [] }),
}));
