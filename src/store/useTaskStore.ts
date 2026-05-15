import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress?: number;
  projectId?: string;
  updatedAt?: Date;
  category?: string;
  location?: string;
  directory?: string;
  tags?: string[];
  subtasks?: TaskSubtask[];
}

interface TaskState {
  tasks: Task[];
  addTask: (task: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}

const seededTasks: Task[] = [
  {
    id: "tsk_8922",
    title: "ENCRYPT_LOCAL_DATABASE",
    description: "Harden mirrored storage before uplink synchronization.",
    status: "todo",
    priority: "critical",
    progress: 0,
    projectId: "1",
    category: "SECURITY",
    location: "SECTOR_07",
    directory: "/ACTIVE_LOGS",
    tags: ["#security", "#uplink"],
    updatedAt: new Date(),
  },
  {
    id: "tsk_8925",
    title: "UPDATE_DRONE_FIRMWARE",
    description: "Deploy patched telemetry package to hangar cluster.",
    status: "todo",
    priority: "low",
    progress: 0,
    projectId: "2",
    category: "HARDWARE",
    location: "HANGAR_4",
    directory: "/ALL_RESOURCES",
    tags: ["#infra"],
    updatedAt: new Date(),
  },
  {
    id: "tsk_8881",
    title: "NEURAL_LINK_STABILIZATION",
    description: "Tune neural handshake for long-haul operator sessions.",
    status: "in-progress",
    priority: "medium",
    progress: 45,
    projectId: "1",
    category: "BIOTECH",
    location: "LAB_09",
    directory: "/SECURE_VAULT",
    tags: ["#neural"],
    updatedAt: new Date(),
  },
  {
    id: "tsk_8770",
    title: "RECRUIT_NEW_AGENTS",
    description: "Finalize onboarding packet for field candidates.",
    status: "completed",
    priority: "high",
    progress: 100,
    projectId: "2",
    category: "HR_OPS",
    location: "P02_MID",
    directory: "/ARCHIVE_EXT",
    tags: ["#security"],
    updatedAt: new Date(),
  },
];

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: seededTasks,
      addTask: async (task) => {
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...task,
              id: crypto.randomUUID(),
              updatedAt: new Date(),
            },
          ],
        }));
      },
      updateTask: async (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...updates,
                  progress:
                    updates.status === "completed"
                      ? 100
                      : updates.status === "todo"
                        ? 0
                        : updates.progress ?? task.progress ?? 45,
                  updatedAt: new Date(),
                }
              : task
          ),
        }));
      },
      deleteTask: async (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },
      addSubtask: async (taskId, title) => {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
          return;
        }

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: [
                    ...(task.subtasks ?? []),
                    {
                      id: crypto.randomUUID(),
                      title: normalizedTitle,
                      completed: false,
                      createdAt: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : task
          ),
        }));
      },
      toggleSubtask: async (taskId, subtaskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks ?? []).map((subtask) =>
                    subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
                  ),
                  updatedAt: new Date(),
                }
              : task
          ),
        }));
      },
      deleteSubtask: async (taskId, subtaskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks ?? []).filter((subtask) => subtask.id !== subtaskId),
                  updatedAt: new Date(),
                }
              : task
          ),
        }));
      },
    }),
    {
      name: "arkan-tasks",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
