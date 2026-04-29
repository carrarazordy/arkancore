
import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Clock,
  Command,
  Cpu,
  Database,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Signal,
  Square,
  Trash2,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalInbox } from "@/components/layout/GlobalInbox";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useProjectStore, Project } from "@/store/useProjectStore";
import { useDialogStore } from "@/store/useDialogStore";
import { TechnicalGridBackground } from "@/components/ui/TechnicalGridBackground";
import { ModuleInitModal } from "@/components/ui/ModuleInitModal";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useChronosStore } from "@/store/useChronosStore";
import { useHardwareMetrics } from "@/store/useHardwareMetrics";

function formatRuntime(startedAt: number, now: number = Date.now()) {
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatClock(now: number) {
  return new Date(now).toLocaleTimeString("en-US", { hour12: false });
}

function parseOperationBuffer(buffer: string) {
  const normalized = buffer
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    title: normalized[0] ?? "",
    description: normalized.slice(1).join(" "),
  };
}

function useOperationsEngine() {
  const { projects } = useProjectStore();
  const { tasks, updateTask, addTask } = useTaskStore();
  const { heartbeatMs, cpuUsage, memUsage, netSpeed, tick } = useChronosStore();
  const { metrics, updateMetrics } = useHardwareMetrics();
  const [activeView, setActiveView] = useState<"GRID" | "PROJECT_EXPANDED">("GRID");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<"LIST" | "KANBAN" | "GRID">("KANBAN");
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [sessionStartTime] = useState(() => Date.now());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsLoading(false), 650);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let cycle = 0;
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
      tick();
      cycle += 1;
      if (cycle % 4 === 0) {
        updateMetrics();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [tick, updateMetrics]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === selectedProjectId),
    [tasks, selectedProjectId]
  );

  const expandProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView("PROJECT_EXPANDED");
  };

  const returnToGrid = () => {
    setSelectedProjectId(null);
    setActiveView("GRID");
  };

  return {
    state: {
      projects,
      tasks,
      selectedProject,
      projectTasks,
      systemStatus: "OPTIMAL",
      activeView,
      selectedProjectId,
      taskViewMode,
      isLoading,
      metrics,
      heartbeatMs,
      cpuUsage,
      memUsage,
      netSpeed,
      now,
      sessionStartTime,
    },
    actions: {
      setTaskViewMode,
      updateTask,
      addTask,
      expandProject,
      returnToGrid,
    },
  };
}

type OperationsProjectNodeProps = {
  project: Project;
  taskCount: number;
  activeCount: number;
  onOpen: (id: string) => void;
  onEdit: (event: React.MouseEvent, project: Project) => void;
  onDelete: (event: React.MouseEvent, id: string, name: string) => void;
};

function OperationsProjectNode({ project, taskCount, activeCount, onOpen, onEdit, onDelete }: OperationsProjectNodeProps) {
  return (
    <div
      onClick={() => onOpen(project.id)}
      onMouseEnter={() => ArkanAudio.play("ui_hover_shimmer")}
      className="group relative flex min-h-[220px] cursor-pointer flex-col overflow-hidden border border-primary/15 bg-[#050502] p-5 text-left transition-all hover:border-primary/45 hover:bg-primary/5"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-primary/35">{project.technicalId}</div>
          <h3 className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-white group-hover:text-primary">{project.name}</h3>
          <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-primary/45">{project.status ?? 'ROUTINE'}</div>
          {project.description ? <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/22">{project.description}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => onEdit(event, project)}
            className="rounded-sm border border-primary/15 p-2 text-primary/45 transition hover:border-primary/40 hover:text-primary"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(event) => onDelete(event, project.id, project.name)}
            className="rounded-sm border border-primary/15 p-2 text-primary/45 transition hover:border-primary/40 hover:text-primary"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/28">
        <span>Active_Modules</span>
        <span className="text-primary">{activeCount}</span>
      </div>
      <div className="mt-2 h-1 bg-white/5">
        <div className="h-full bg-primary shadow-[0_0_10px_rgba(255,255,0,0.45)]" style={{ width: `${project.progress}%` }} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.18em] text-white/35">
        <div className="border border-primary/10 p-3">
          <div>Total_Tasks</div>
          <div className="mt-2 text-lg font-semibold text-primary">{taskCount}</div>
        </div>
        <div className="border border-primary/10 p-3">
          <div>Progress</div>
          <div className="mt-2 text-lg font-semibold text-primary">{project.progress}%</div>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(project.id);
        }}
        className="mt-auto pt-6 text-left text-[10px] uppercase tracking-[0.22em] text-primary/55 transition hover:text-primary"
      >
        Open_Module_Stream
      </button>
    </div>
  );
}
export default function OperationsPage() {
  const { state, actions } = useOperationsEngine();
  const {
    projects,
    selectedProject,
    projectTasks,
    systemStatus,
    activeView,
    selectedProjectId,
    taskViewMode,
    isLoading,
    metrics,
    heartbeatMs,
    cpuUsage,
    memUsage,
    netSpeed,
    now,
    sessionStartTime,
  } = state;
  const { setTaskViewMode, updateTask, addTask, expandProject, returnToGrid } = actions;

  const [searchQuery, setSearchQuery] = useState("");
  const [operationQuery, setOperationQuery] = useState("");
  const [quickBuffer, setQuickBuffer] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem("arkan-operations-quick-buffer") ?? "";
  });
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectEditorTarget, setProjectEditorTarget] = useState<Project | null>(null);
  const [sessionId] = useState(() => `${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`);
  const [sessionLogs, setSessionLogs] = useState<string[]>([
    "SYSTEM_HEARTBEAT_ACKNOWLEDGED",
    "CACHE_LAYER_SYNCHRONIZED",
    "EDGE_NODE_LINK_STABLE",
    "ACTIVE_STREAM_READY",
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("arkan-operations-quick-buffer", quickBuffer);
    }
  }, [quickBuffer]);

  const addLog = (message: string) => {
    const timestamp = formatClock(Date.now());
    setSessionLogs((previous) => [`[${timestamp}] ${message}`, ...previous].slice(0, 6));
  };

  const handleInitProject = () => {
    ArkanAudio.playFast("system_engage");
    setProjectEditorTarget(null);
    setIsNewProjectModalOpen(true);
  };

  const handleEditProject = (event: React.MouseEvent, project: Project) => {
    event.stopPropagation();
    ArkanAudio.playFast("system_engage");
    setProjectEditorTarget(project);
    setIsNewProjectModalOpen(true);
  };

  const handleDeleteProject = (event: React.MouseEvent, id: string, name: string) => {
    event.stopPropagation();
    ArkanAudio.playFast("system_engage");
    useDialogStore.getState().openDialog({
      title: `PURGE PROTOCOL // ${name}`,
      confirmLabel: "PURGE_DATA",
      hideInput: true,
      onConfirm: async () => {
        await useProjectStore.getState().deleteProject(id);
        addLog(`PROJECT_${id}_PURGED`);
        ArkanAudio.playFast("system_purge");
      },
    });
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }

    const normalizedQuery = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.technicalId.toLowerCase().includes(normalizedQuery)
    );
  }, [projects, searchQuery]);

  const filteredProjectTasks = useMemo(() => {
    if (!operationQuery.trim()) {
      return projectTasks;
    }

    const normalizedQuery = operationQuery.toLowerCase();
    return projectTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.description?.toLowerCase().includes(normalizedQuery)
    );
  }, [operationQuery, projectTasks]);

  const completedTasks = projectTasks.filter((task) => task.status === "completed").length;
  const inProgressTasks = projectTasks.filter((task) => task.status === "in-progress").length;
  const progressPercentage = projectTasks.length === 0
    ? selectedProject?.progress ?? 0
    : Math.round((completedTasks / projectTasks.length) * 100);

  const handleAddOperation = async () => {
    if (!selectedProjectId || !selectedProject) {
      return;
    }

    const bufferedOperation = parseOperationBuffer(quickBuffer);
    const createOperation = async (title: string, description?: string) => {
      await addTask({
        title,
        description,
        status: "todo",
        priority: "medium",
        projectId: selectedProjectId,
      });
      addLog(`TASK_BUFFER_COMMITTED_TO_${selectedProject.technicalId}`);
      ArkanAudio.playFast("system_engage");
      setQuickBuffer("");
    };

    if (!bufferedOperation.title) {
      useDialogStore.getState().openDialog({
        title: `NEW_OPERATION // ${selectedProject.name}`,
        description: "DEFINE_OPERATION_TITLE",
        placeholder: "OPERATION_NAME...",
        confirmLabel: "COMMIT_TO_STREAM",
        onConfirm: async (value) => {
          const normalizedTitle = value?.trim();
          if (!normalizedTitle) {
            return;
          }

          await createOperation(normalizedTitle, "");
        },
      });
      return;
    }

    await createOperation(bufferedOperation.title, bufferedOperation.description || `Buffered for ${selectedProject.name}`);
  };

  const handleEditOperation = (task: Task) => {
    ArkanAudio.playFast("system_engage");
    useDialogStore.getState().openDialog({
      title: `EDIT_OPERATION // ${task.title}`,
      description: "UPDATE_OPERATION_TITLE",
      placeholder: task.title,
      confirmLabel: "SAVE_CHANGES",
      onConfirm: async (value) => {
        const normalizedTitle = value?.trim();
        if (!normalizedTitle || normalizedTitle === task.title) {
          return;
        }

        await updateTask(task.id, { title: normalizedTitle });
        addLog(`TASK_${task.id.substring(0, 4)}_RENAMED`);
        ArkanAudio.playFast("system_execute_clack");
      },
    });
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    await updateTask(task.id, { status: nextStatus });
    addLog(`TASK_${task.id.substring(0, 4)}_STATUS_UPDATED`);
    ArkanAudio.playFast("system_execute_clack");
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-black text-primary font-mono">
      <TechnicalGridBackground />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-4 p-6">
        <div className="space-y-3 border-b border-primary/10 pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.28em] text-white/35">
              <span className="text-primary">System_Status: {systemStatus}</span>
              <span>CPU: {metrics.cpu}%</span>
              <span>MEM: {metrics.ram.toFixed(1)}GB</span>
              <span>NET: {netSpeed}</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex h-10 min-w-[300px] items-center gap-3 border border-primary/15 bg-black/80 px-3 text-primary/40 focus-within:border-primary/40 focus-within:text-primary/70">
                <Search size={14} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="SCAN_ACTIVE_OPERATIONS..."
                  className="w-full bg-transparent text-[11px] uppercase tracking-[0.18em] text-white/70 outline-none placeholder:text-white/18"
                />
                <span className="inline-flex items-center gap-1 border border-primary/15 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-primary/55">
                  <Command size={10} />
                  K
                </span>
              </label>
              <div className="inline-flex items-center gap-2 border border-primary/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-primary/80">
                <Clock size={12} />
                ARKAN_USER
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-6 text-[10px] uppercase tracking-[0.24em] text-white/28">
              <span className="text-primary/80">System_Status: Operational</span>
              <span className="text-red-400/80">ARK_CORE_DB: CRITICAL_ERROR</span>
              <span className="inline-flex items-center gap-2"><Signal size={12} /> Latency: {Math.round(heartbeatMs)}ms</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="border border-primary/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-primary/70">Search CMD+K</div>
              <button
                type="button"
                onClick={handleInitProject}
                className="border border-primary/40 bg-primary px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-black transition hover:brightness-110"
              >
                + INIT_PROJECT
              </button>
            </div>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-4 opacity-55"
            >
              <Cpu className="h-12 w-12 animate-spin text-primary" />
              <span className="text-xs tracking-[0.3em]">ESTABLISHING_UPLINK...</span>
            </motion.div>
          ) : activeView === "GRID" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_280px]"
            >
              <aside className="min-h-0 overflow-hidden border border-primary/10 bg-black/65">
                <GlobalInbox />
              </aside>

              <section className="flex min-h-0 flex-col overflow-hidden border border-primary/10 bg-black/65">
                <div className="flex items-center justify-between border-b border-primary/10 px-5 py-5">
                  <div>
                    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
                      <LayoutGrid size={16} className="text-primary" />
                      ACTIVE_OPERATIONS
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-primary/45">Command_Center // Viewing active modules</div>
                  </div>
                  <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary/65">
                    <Square className="h-3 w-3 fill-primary" />
                    GRID_LAYOUT_ACTIVE
                  </div>
                </div>

                <div className="border-b border-primary/10 px-5 py-4">
                  <label className="flex h-11 items-center gap-3 border border-primary/15 bg-black/70 px-4 text-primary/40 focus-within:border-primary/40 focus-within:text-primary/70">
                    <Search size={14} />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="SEARCH_ACTIVE_OPERATIONS..."
                      className="w-full bg-transparent text-[11px] uppercase tracking-[0.18em] text-white/70 outline-none placeholder:text-white/18"
                    />
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                    <button
                      type="button"
                      onClick={handleInitProject}
                      onMouseEnter={() => ArkanAudio.play("ui_hover_shimmer")}
                      className="group flex min-h-[220px] flex-col items-center justify-center border border-dashed border-primary/20 bg-black/40 text-primary/45 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    >
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 group-hover:shadow-[0_0_18px_rgba(255,255,0,0.2)]">
                        <Plus size={28} />
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.24em]">INITIALIZE_NEW_MODULE</div>
                    </button>

                    {filteredProjects.map((project) => {
                      const relatedTasks = project.id ? state.tasks.filter((task) => task.projectId === project.id) : [];
                      const activeTasks = relatedTasks.filter((task) => task.status !== "completed").length;

                      return (
                          <OperationsProjectNode
                            key={project.id}
                            project={project}
                            taskCount={relatedTasks.length}
                            activeCount={activeTasks}
                            onOpen={expandProject}
                            onEdit={handleEditProject}
                            onDelete={handleDeleteProject}
                          />
                        );
                    })}
                  </div>
                </div>
              </section>

              <aside className="flex min-h-0 flex-col gap-4">
                <div className="border border-primary/10 bg-black/70 p-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary/65">
                    <Activity size={12} />
                    SYSTEM_UPTIME
                  </div>
                  <div className="mt-4 text-[36px] font-semibold tracking-[0.08em] text-primary">{formatRuntime(sessionStartTime, now)}</div>
                </div>

                <div className="flex min-h-[260px] flex-1 flex-col border border-primary/10 bg-black/70">
                  <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-primary/70">
                    <span>QUICK_BUFFER</span>
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(255,255,0,0.6)]" />
                  </div>
                  <textarea
                    value={quickBuffer}
                    onChange={(event) => setQuickBuffer(event.target.value)}
                    placeholder="> ENTER_TEMPORAL_DATA..."
                    className="h-full w-full resize-none bg-transparent px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/60 outline-none placeholder:text-white/18"
                  />
                </div>

                <div className="border border-primary/10 bg-black/70 p-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary/65">
                    <Database size={12} />
                    SESSION_ID
                  </div>
                  <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/35">{sessionId}</div>
                </div>
              </aside>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_280px]"
            >
              <section className="flex min-h-0 flex-col overflow-hidden border border-primary/10 bg-black/65">
                <div className="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-5 py-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-primary/75">OPERATIONS_LOG</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/20">Priority segmented task stream</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-primary/60">{filteredProjectTasks.length}_ITEMS</div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 custom-scrollbar">
                  {["critical", "high", "medium", "low"].map((priority) => {
                    const priorityTasks = filteredProjectTasks.filter((task) => task.priority === priority);
                    if (priorityTasks.length === 0) {
                      return null;
                    }

                    return (
                      <div key={priority} className="space-y-3">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-primary/40">Priority // {priority}</div>
                        {priorityTasks.map((task) => (
                          <div key={task.id} className="border border-primary/15 bg-primary/5 p-4 transition hover:border-primary/35">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={task.status === "completed"}
                                onChange={() => void handleToggleTaskStatus(task)}
                                className="mt-1 h-4 w-4 rounded border-primary bg-transparent text-primary focus:ring-primary focus:ring-offset-black"
                              />
                              <div className="flex-1">
                                <div className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", task.status === "completed" ? "text-white/35 line-through" : "text-white/85")}>
                                  {task.title}
                                </div>
                                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-primary/35">{task.status} // {task.id.substring(0, 6)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-primary/10 p-4">
                  <button
                    type="button"
                    onClick={() => void handleAddOperation()}
                    className="w-full border border-dashed border-primary/20 py-3 text-[10px] uppercase tracking-[0.24em] text-primary/60 transition hover:border-primary/45 hover:bg-primary/5 hover:text-primary"
                  >
                    + ADD_NEW_OPERATION
                  </button>
                </div>
              </section>
              <section className="flex min-h-0 flex-col overflow-hidden border border-primary/10 bg-black/65">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={returnToGrid}
                      className="flex h-9 w-9 items-center justify-center border border-primary/20 text-primary/65 transition hover:border-primary/45 hover:text-primary"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white">{selectedProject?.name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-primary/45">{selectedProject?.technicalId} // ACTIVE_TASK_STREAM</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedProject ? (
                      <button
                        type="button"
                        onClick={(event) => handleEditProject(event, selectedProject)}
                        className="inline-flex items-center gap-2 border border-primary/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-primary/70 transition hover:border-primary/45 hover:text-primary"
                      >
                        <Pencil size={12} />
                        Edit_Module
                      </button>
                    ) : null}
                    <div className="flex items-center gap-2 border border-primary/15 bg-black/70 p-1">
                    {[
                      { id: "LIST", label: "LIST", icon: List },
                      { id: "KANBAN", label: "KANBAN", icon: LayoutGrid },
                      { id: "GRID", label: "GRID", icon: Square },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setTaskViewMode(mode.id as "LIST" | "KANBAN" | "GRID")}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors",
                          taskViewMode === mode.id ? "bg-primary text-black" : "text-primary/55 hover:text-primary"
                        )}
                      >
                        <mode.icon size={12} />
                        {mode.label}
                      </button>
                    ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-b border-primary/10 px-5 py-4">
                  <label className="flex h-10 min-w-[280px] items-center gap-3 border border-primary/15 bg-black/70 px-4 text-primary/40 focus-within:border-primary/40 focus-within:text-primary/70">
                    <Search size={14} />
                    <input
                      value={operationQuery}
                      onChange={(event) => setOperationQuery(event.target.value)}
                      placeholder="FILTER_PROJECT_STREAM..."
                      className="w-full bg-transparent text-[11px] uppercase tracking-[0.18em] text-white/70 outline-none placeholder:text-white/18"
                    />
                  </label>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-primary/50">{filteredProjectTasks.length}_OPERATIONS_VISIBLE</div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {taskViewMode === "KANBAN" && <KanbanView tasks={filteredProjectTasks} updateTask={updateTask} addLog={addLog} onEditTask={handleEditOperation} />}
                  {taskViewMode === "LIST" && <ListView tasks={filteredProjectTasks} onEditTask={handleEditOperation} />}
                  {taskViewMode === "GRID" && <GridView tasks={filteredProjectTasks} onEditTask={handleEditOperation} />}
                </div>
              </section>

              <aside className="flex min-h-0 flex-col gap-4">
                <div className="border border-primary/10 bg-black/70 p-5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-primary/65">MISSION_PROGRESS</div>
                  <div className="mt-4 text-[34px] font-semibold tracking-[0.08em] text-primary">{progressPercentage}%</div>
                  <div className="mt-3 h-1 bg-white/5">
                    <div className="h-full bg-primary shadow-[0_0_10px_rgba(255,255,0,0.45)]" style={{ width: `${progressPercentage}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.18em] text-white/35">
                    <div className="border border-primary/10 p-3">Completed<div className="mt-2 text-lg text-primary">{completedTasks}</div></div>
                    <div className="border border-primary/10 p-3">In_Progress<div className="mt-2 text-lg text-primary">{inProgressTasks}</div></div>
                  </div>
                </div>

                <div className="flex-1 border border-primary/10 bg-black/70 p-5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-primary/65">COMPLETION_CURVE</div>
                  <div className="relative mt-5 h-40 border-l border-b border-primary/15">
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <path d="M0 120 Q 70 100, 130 82 T 260 28" fill="none" stroke="#f9f906" strokeWidth="2" />
                      <path d="M0 120 Q 70 100, 130 82 T 260 28 L 260 140 L 0 140 Z" fill="url(#operations-progress)" opacity="0.18" />
                      <defs>
                        <linearGradient id="operations-progress" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#f9f906" />
                          <stop offset="100%" stopColor="#f9f906" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute right-3 top-3 text-[10px] uppercase tracking-[0.18em] text-primary/40">TREND: POSITIVE</div>
                  </div>
                </div>

                <div className="border border-primary/10 bg-black/70 p-5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-primary/65">QUICK_BUFFER</div>
                  <textarea
                    value={quickBuffer}
                    onChange={(event) => setQuickBuffer(event.target.value)}
                    placeholder="> BUFFER_NEW_OPERATION..."
                    className="mt-4 h-28 w-full resize-none bg-transparent text-[11px] uppercase tracking-[0.18em] text-white/60 outline-none placeholder:text-white/18"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddOperation()}
                    className="mt-4 w-full border border-primary/35 bg-primary px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-black transition hover:brightness-110"
                  >
                    Commit_To_Stream
                  </button>
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="grid gap-4 border-t border-primary/10 pt-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.4fr)]">
          <div className="border border-primary/10 bg-black/70 px-4 py-4">
            <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-primary/65">
              <span>SESSION_LOGS</span>
              <span className="text-white/22">SYSTEM_HEARTBEAT</span>
            </div>
            <div className="space-y-2">
              {sessionLogs.map((log) => (
                <div key={log} className="text-[10px] uppercase tracking-[0.16em] text-white/45">&gt; {log}</div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-primary/10 bg-black/70 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-primary/65">CPU_CORE_LOAD</div>
              <div className="mt-3 text-[28px] font-semibold tracking-[0.08em] text-primary">{cpuUsage}%</div>
              <div className="mt-3 h-1 bg-white/5"><div className="h-full w-[42%] bg-primary shadow-[0_0_10px_rgba(255,255,0,0.45)]" /></div>
            </div>
            <div className="border border-primary/10 bg-black/70 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-primary/65">MEMORY_POOL</div>
              <div className="mt-3 text-[28px] font-semibold tracking-[0.08em] text-primary">{memUsage}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/35">Clock: {formatClock(now)}</div>
            </div>
          </div>

          <div className="border border-primary/10 bg-primary/8 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-primary/65">UPLINK_STATUS</div>
            <div className="mt-3 text-[22px] font-semibold tracking-[0.08em] text-primary">DATA_SYNC</div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/35">Nominal</div>
          </div>
        </footer>
      </div>

        <ModuleInitModal
          isOpen={isNewProjectModalOpen}
          project={projectEditorTarget}
          onSaved={(projectId) => expandProject(projectId)}
          onClose={() => {
            setIsNewProjectModalOpen(false);
            setProjectEditorTarget(null);
          }}
        />
      </div>
  );
}
function KanbanView({
  tasks,
  updateTask,
  addLog,
  onEditTask,
}: {
  tasks: Task[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  addLog: (message: string) => void;
  onEditTask: (task: Task) => void;
}) {
  const todos = tasks.filter((task) => task.status === "todo");
  const inProgress = tasks.filter((task) => task.status === "in-progress");
  const completed = tasks.filter((task) => task.status === "completed");

  const handleDragStart = (event: React.DragEvent, taskId: string) => {
    event.dataTransfer.setData("text/plain", taskId);
  };

  const handleDrop = async (event: React.DragEvent, status: string) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    if (!taskId) {
      return;
    }

    await updateTask(taskId, { status });
    addLog(`TASK_${taskId.substring(0, 4)}_MOVED_TO_${status.toUpperCase()}`);
    ArkanAudio.playFast("system_execute_clack");
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4 custom-scrollbar">
      {[
        { id: "todo", label: "TO_DO", items: todos, accent: "border-primary text-primary/80" },
        { id: "in-progress", label: "IN_PROGRESS", items: inProgress, accent: "border-primary text-primary" },
        { id: "completed", label: "COMPLETED", items: completed, accent: "border-primary/35 text-primary/40" },
      ].map((column) => (
        <div
          key={column.id}
          className="flex min-w-[280px] flex-1 flex-col gap-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void handleDrop(event, column.id)}
        >
          <div className={cn("border-l-2 pl-3", column.accent)}>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em]">
              <span>[ {column.label} ]</span>
              <span className="border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] text-primary/60">{column.items.length}</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
            {column.items.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(event) => handleDragStart(event, task.id)}
                className={cn(
                  "cursor-grab border p-4 transition active:cursor-grabbing",
                  task.status === "in-progress" ? "border-primary bg-primary/8" : task.status === "completed" ? "border-primary/10 bg-black/60 opacity-65" : "border-primary/15 bg-[#090903] hover:border-primary/35"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", task.status === "completed" ? "text-white/35 line-through" : "text-white/85")}>{task.title}</div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-primary/35">{task.priority} // {task.id.substring(0, 6)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditTask(task);
                      }}
                      className="rounded-sm border border-primary/15 p-1 text-primary/45 transition hover:border-primary/35 hover:text-primary"
                    >
                      <Pencil size={12} />
                    </button>
                    <Zap size={14} className={cn(task.status === "in-progress" ? "text-primary" : "text-primary/25")} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ tasks, onEditTask }: { tasks: Task[]; onEditTask: (task: Task) => void }) {
  return (
    <div className="h-full space-y-2 overflow-y-auto p-5 custom-scrollbar">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-4 border border-primary/15 bg-[#090903] px-4 py-4 transition hover:border-primary/35">
          <div className={cn("h-2 w-2 rounded-full", task.status === "completed" ? "bg-green-500/70" : task.status === "in-progress" ? "bg-primary animate-pulse" : "bg-primary/40")} />
          <div className="flex-1">
            <div className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", task.status === "completed" ? "text-white/35 line-through" : "text-white/85")}>{task.title}</div>
            {task.description ? <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-primary/35">{task.description}</div> : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="rounded-sm border border-primary/15 p-2 text-primary/45 transition hover:border-primary/35 hover:text-primary"
            >
              <Pencil size={12} />
            </button>
            <div className="text-right text-[10px] uppercase tracking-[0.18em] text-primary/45">
            <div>{task.priority}</div>
            <div className="mt-2">{task.status}</div>
            </div>
          </div>
        </div>
      ))}
      {tasks.length === 0 ? <div className="py-12 text-center text-[10px] uppercase tracking-[0.24em] text-primary/35">NO_ACTIVE_TASKS_FOUND</div> : null}
    </div>
  );
}

function GridView({ tasks, onEditTask }: { tasks: Task[]; onEditTask: (task: Task) => void }) {
  return (
    <div className="h-full overflow-y-auto p-5 custom-scrollbar">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex min-h-[170px] flex-col border border-primary/15 bg-[#090903] p-4 transition hover:border-primary/35">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[9px] uppercase tracking-[0.18em] text-primary/30">{task.id.substring(0, 8)}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="rounded-sm border border-primary/15 p-2 text-primary/45 transition hover:border-primary/35 hover:text-primary"
                >
                  <Pencil size={12} />
                </button>
                <div className={cn("h-2 w-2 rounded-full", task.status === "completed" ? "bg-green-500/70" : task.status === "in-progress" ? "bg-primary animate-pulse" : "bg-primary/40")} />
              </div>
            </div>
            <div className={cn("mt-5 text-[12px] font-semibold uppercase tracking-[0.14em]", task.status === "completed" ? "text-white/35 line-through" : "text-white/85")}>{task.title}</div>
            <div className="mt-auto border-t border-primary/10 pt-3 text-[10px] uppercase tracking-[0.18em] text-primary/45">
              <div>{task.priority}</div>
              <div className="mt-2">{task.status}</div>
            </div>
          </div>
        ))}
      </div>
      {tasks.length === 0 ? <div className="py-12 text-center text-[10px] uppercase tracking-[0.24em] text-primary/35">NO_ACTIVE_TASKS_FOUND</div> : null}
    </div>
  );
}

