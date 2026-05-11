import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ProjectOperation {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignee?: string;
}

export interface Project {
  id: string;
  technicalId: string;
  name: string;
  progress: number;
  status?: string;
  description?: string;
  notes?: string;
  operations?: ProjectOperation[];
}

interface ProjectState {
  projects: Project[];
  deleteProject: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, "id" | "technicalId"> & { technicalId?: string }) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, "id">>) => Promise<void>;
}

function normalizeProjectTechnicalId(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function getNextProjectTechnicalId(projects: Project[]) {
  const nextNumber =
    projects.reduce((maxValue, project) => {
      const match = project.technicalId.match(/^PRJ-(\d+)$/i);
      return Math.max(maxValue, match ? Number(match[1]) : 0);
    }, 0) + 1;

  return `PRJ-${String(nextNumber).padStart(3, "0")}`;
}

function ensureUniqueProjectTechnicalId(
  projects: Project[],
  desiredTechnicalId: string | undefined,
  currentProjectId?: string
) {
  const fallbackTechnicalId = getNextProjectTechnicalId(projects);
  const baseTechnicalId = normalizeProjectTechnicalId(desiredTechnicalId || fallbackTechnicalId) || fallbackTechnicalId;

  if (!projects.some((project) => project.technicalId === baseTechnicalId && project.id !== currentProjectId)) {
    return baseTechnicalId;
  }

  let suffix = 2;
  let candidate = `${baseTechnicalId}_${suffix}`;
  while (projects.some((project) => project.technicalId === candidate && project.id !== currentProjectId)) {
    suffix += 1;
    candidate = `${baseTechnicalId}_${suffix}`;
  }

  return candidate;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [
        {
          id: "1",
          technicalId: "PRJ-001",
          name: "Alpha Protocol",
          progress: 64,
          operations: [
            { id: "op-alpha-1", title: "Initialize Neural Sync Protocols", priority: "CRITICAL", status: "DEPLOYED", assignee: "ARKAN_CORE" },
          ],
        },
        {
          id: "2",
          technicalId: "PRJ-002",
          name: "Beta System",
          progress: 22,
          operations: [
            { id: "op-beta-1", title: "Initialize Neural Sync Protocols", priority: "CRITICAL", status: "DEPLOYED", assignee: "ARKAN_CORE" },
            { id: "op-beta-2", title: "Refactor Core Logic v2.4", priority: "PENDING", status: "ASSIGNED", assignee: "ARKAN_CORE" },
          ],
        },
      ],
      deleteProject: async (id) => {
        set((state) => ({ projects: state.projects.filter(p => p.id !== id) }));
      },
      addProject: (project) => {
        let createdProject: Project | null = null;

        set((state) => {
          createdProject = {
            ...project,
            id: crypto.randomUUID(),
            technicalId: ensureUniqueProjectTechnicalId(state.projects, project.technicalId),
            notes: project.description,
            operations: [],
          };

          return {
            projects: [...state.projects, createdProject],
          };
        });

        return createdProject as Project;
      },
      updateProject: async (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? {
                  ...project,
                  ...updates,
                  technicalId: updates.technicalId
                    ? ensureUniqueProjectTechnicalId(state.projects, updates.technicalId, id)
                    : project.technicalId,
                }
              : project
          ),
        }));
      },
    }),
    {
      name: "arkan-projects",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
