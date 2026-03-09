import { create } from "zustand";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress?: number;
  projectId?: string;
  updatedAt?: Date;
}

interface TaskState {
  tasks: Task[];
  addTask: (task: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  addTask: async (task) => {
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: Math.random().toString(36).substring(7), updatedAt: new Date() }]
    }));
  },
  updateTask: async (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) => 
        task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
      )
    }));
  },
}));
