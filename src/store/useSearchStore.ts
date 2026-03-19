import { create } from "zustand";
import { buildSearchDocuments, searchDocuments } from "@/lib/search";
import { useNoteStore } from "@/store/useNoteStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { useTaskStore } from "@/store/useTaskStore";

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  description?: string;
  action?: string;
  route?: string;
  technicalId?: string;
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

function buildQuickResults(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const documents = buildSearchDocuments({
    projects: useProjectStore.getState().projects,
    tasks: useTaskStore.getState().tasks,
    notes: useNoteStore.getState().nodes,
    logs: useSystemLogStore.getState().logs,
  });

  return searchDocuments(documents, query, { limit: 6 }).map((result) => ({
    id: result.id,
    title: result.title,
    type: result.source,
    description: result.snippet || result.breadcrumb.join(" > "),
    route: result.route,
    technicalId: result.technicalId,
  }));
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
  isOpen: false,
  toggleSearch: (isOpen) => set({ isOpen }),
  results: [],
  executeSearch: (query) => {
    set({ results: buildQuickResults(query) });
  },
  clearResults: () => set({ results: [] }),
}));
