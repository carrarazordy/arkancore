import { create } from "zustand";

export interface Project {
  id: string;
  technicalId: string;
  name: string;
  progress: number;
  status?: string;
  description?: string;
}

interface ProjectState {
  projects: Project[];
  deleteProject: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'technicalId'>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [
    { id: "1", technicalId: "PRJ-001", name: "Alpha Protocol", progress: 64 },
    { id: "2", technicalId: "PRJ-002", name: "Beta System", progress: 22 }
  ],
  deleteProject: async (id) => {
    set((state) => ({ projects: state.projects.filter(p => p.id !== id) }));
  },
  addProject: (project) => {
    set((state) => ({
      projects: [...state.projects, {
        ...project,
        id: Math.random().toString(36).substr(2, 9),
        technicalId: `PRJ-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
      }]
    }));
  }
}));
