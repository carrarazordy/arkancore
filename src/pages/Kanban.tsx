import React, { useEffect, useMemo, useState } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  CheckSquare2,
  Columns3,
  Edit3,
  ListTree,
  MoreVertical,
  Plus,
  PlusCircle,
  Search,
  Shield,
  Signal,
  Trash2,
  Zap,
} from "lucide-react";
import { useDialogStore } from "@/store/useDialogStore";

function formatClock(now: number) {
  return new Date(now).toLocaleTimeString("en-US", { hour12: false });
}

function formatRuntime(startedAt: number, now: number) {
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function priorityLabel(priority: string) {
  switch (priority) {
    case "critical":
      return "HIGH_CRITICAL";
    case "high":
      return "HIGH_PRIORITY";
    case "medium":
      return "MID_PRIORITY";
    case "low":
      return "LOW_PRIORITY";
    default:
      return priority.toUpperCase();
  }
}

function statusDisplay(status: string) {
  if (status === "in-progress") return "IN_PROGRESS";
  return status.toUpperCase();
}

function clampProgress(task: Task) {
  if (task.status === "completed") return 100;
  if (task.status === "todo") return 0;
  return task.progress ?? 45;
}

type TaskCardProps = {
  task: Task;
  onDragStart: (event: React.DragEvent, taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubtask: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
};

function TaskCard({ task, onDragStart, onEdit, onDelete, onAddSubtask, onToggleSubtask }: TaskCardProps) {
  const accentClass =
    task.status === "in-progress"
      ? "border-primary shadow-[0_0_12px_rgba(255,255,0,0.12)]"
      : task.status === "completed"
        ? "border-primary/10 opacity-50 grayscale"
        : "border-primary/25";
  const completedSubtasks = task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
      className={cn(
        "group relative cursor-grab border bg-[#060602] p-4 transition-all active:cursor-grabbing hover:border-primary/50",
        accentClass
      )}
      data-context-target={task.id}
      data-context-type="TASK"
      data-context-name={task.title}
    >
      <div className="absolute right-3 top-3 text-[8px] uppercase tracking-[0.16em] text-primary/28">#{task.id.slice(-4).toUpperCase()}</div>
      <div className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", task.status === "completed" ? "text-primary/35 line-through" : "text-primary")}>
        {task.title}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.16em] text-primary/45">
        <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-primary/75">{task.category ?? "GENERAL"}</span>
        <span>LOC: {task.location ?? "SECTOR_00"}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={cn(
          "border px-2 py-1 text-[9px] uppercase tracking-[0.2em]",
          task.status === "in-progress"
            ? "border-primary/55 bg-primary/12 text-primary"
            : task.status === "completed"
              ? "border-primary/10 bg-primary/5 text-primary/28"
              : "border-primary/25 bg-primary/5 text-primary/75"
        )}>
          {priorityLabel(task.priority)}
        </span>

        <div className="flex items-center gap-2 text-primary/25 transition-colors group-hover:text-primary/55">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddSubtask(task);
            }}
            className="p-1 hover:text-primary"
            aria-label={`Add subtask to ${task.title}`}
          >
            <PlusCircle size={13} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(task);
            }}
            className="p-1 hover:text-primary"
            aria-label={`Edit ${task.title}`}
          >
            <Edit3 size={13} />
          </button>
          {task.status === "completed" ? <CheckCircle2 size={13} /> : <MoreVertical size={13} />}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task);
            }}
            className="p-1 text-red-500/35 hover:text-red-400"
            aria-label={`Delete ${task.title}`}
          >
            X
          </button>
        </div>
      </div>

      {task.status === "in-progress" ? (
        <div className="mt-4 h-0.5 w-full bg-primary/10">
          <div className="h-full bg-primary shadow-[0_0_6px_rgba(255,255,0,0.4)]" style={{ width: `${clampProgress(task)}%` }} />
        </div>
      ) : null}

      <div className="mt-4 border-t border-primary/10 pt-3">
        <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-primary/40">
          <span>SUBTASKS</span>
          <span>{completedSubtasks}/{totalSubtasks}</span>
        </div>
        {task.subtasks?.length ? (
          <div className="space-y-2">
            {task.subtasks.slice(0, 3).map((subtask) => (
              <button
                key={subtask.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSubtask(task.id, subtask.id);
                }}
                className={cn(
                  "flex w-full items-center gap-2 text-left text-[10px] uppercase tracking-[0.14em] transition-colors",
                  subtask.completed ? "text-primary/30 line-through" : "text-white/55 hover:text-primary"
                )}
              >
                <CheckSquare2 size={12} className={subtask.completed ? "text-primary/35" : "text-primary/65"} />
                <span className="min-w-0 truncate">{subtask.title}</span>
              </button>
            ))}
            {task.subtasks.length > 3 ? (
              <div className="text-[9px] uppercase tracking-[0.16em] text-primary/25">
                +{task.subtasks.length - 3}_MORE
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddSubtask(task);
            }}
            className="text-[10px] uppercase tracking-[0.18em] text-primary/35 transition-colors hover:text-primary"
          >
            + ADD_SUBTASK
          </button>
        )}
      </div>
    </div>
  );
}

type TaskListViewProps = {
  tasks: Task[];
  onStatusChange: (task: Task, status: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubtask: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
};

function TaskListView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskListViewProps) {
  return (
    <div className="min-w-[920px] space-y-3">
      {tasks.map((task) => {
        const completedSubtasks = task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
        const totalSubtasks = task.subtasks?.length ?? 0;

        return (
          <article key={task.id} className="border border-primary/14 bg-[#050502]/90 px-4 py-4 transition-colors hover:border-primary/35">
            <div className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_160px_140px_190px_120px] xl:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-primary/32">#{task.id.slice(-4).toUpperCase()}</span>
                  <span className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">{task.title}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-[10px] uppercase tracking-[0.14em] text-white/35">
                  {task.description ?? "NO_DESCRIPTION"}
                </p>
              </div>

              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60">{task.category ?? "GENERAL"}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/50">{priorityLabel(task.priority)}</div>

              <div className="flex items-center gap-2">
                {["todo", "in-progress", "completed"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatusChange(task, status)}
                    className={cn(
                      "border px-2 py-1 text-[9px] uppercase tracking-[0.14em] transition",
                      task.status === status
                        ? "border-primary bg-primary text-black"
                        : "border-primary/15 text-primary/45 hover:border-primary/45 hover:text-primary"
                    )}
                  >
                    {statusDisplay(status)}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 text-primary/45 xl:justify-start">
                <button type="button" onClick={() => onAddSubtask(task)} className="p-2 hover:text-primary" aria-label={`Add subtask to ${task.title}`}>
                  <PlusCircle size={14} />
                </button>
                <button type="button" onClick={() => onEdit(task)} className="p-2 hover:text-primary" aria-label={`Edit ${task.title}`}>
                  <Edit3 size={14} />
                </button>
                <button type="button" onClick={() => onDelete(task)} className="p-2 text-red-500/40 hover:text-red-400" aria-label={`Delete ${task.title}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-primary/10 pt-3">
              <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-primary/35">
                <span>SUBTASK_STREAM</span>
                <span>{completedSubtasks}/{totalSubtasks}</span>
              </div>
              {task.subtasks?.length ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 border border-primary/10 bg-primary/5 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onToggleSubtask(task.id, subtask.id)}
                        className={cn("shrink-0 transition-colors", subtask.completed ? "text-primary/35" : "text-primary/80")}
                        aria-label={`Toggle ${subtask.title}`}
                      >
                        <CheckSquare2 size={13} />
                      </button>
                      <span className={cn("min-w-0 flex-1 truncate text-[10px] uppercase tracking-[0.16em]", subtask.completed ? "text-white/25 line-through" : "text-white/60")}>
                        {subtask.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteSubtask(task.id, subtask.id)}
                        className="shrink-0 text-red-500/30 transition-colors hover:text-red-400"
                        aria-label={`Delete ${subtask.title}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddSubtask(task)}
                  className="text-[10px] uppercase tracking-[0.18em] text-primary/35 transition-colors hover:text-primary"
                >
                  + ADD_FIRST_SUBTASK
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function KanbanPage() {
  const { tasks, updateTask, addTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask } = useTaskStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDirectory, setSelectedDirectory] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [now, setNow] = useState(() => Date.now());
  const [sessionStart] = useState(() => Date.now());
  const [dropStatus, setDropStatus] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const directories = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((task) => {
      const key = task.directory ?? "/UNASSIGNED";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries());
  }, [tasks]);

  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    tasks.forEach((task) => task.tags?.forEach((tag) => allTags.add(tag)));
    return Array.from(allTags);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !searchQuery.trim() || [task.title, task.id, task.description, task.category, task.location]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDirectory = selectedDirectory === "ALL" || (task.directory ?? "/UNASSIGNED") === selectedDirectory;
      const matchesTag = selectedTag === "ALL" || task.tags?.includes(selectedTag);

      return matchesSearch && matchesDirectory && matchesTag;
    });
  }, [searchQuery, selectedDirectory, selectedTag, tasks]);

  const columns = useMemo(
    () => [
      { id: "todo", label: "TO_DO", tasks: filteredTasks.filter((task) => task.status === "todo") },
      { id: "in-progress", label: "IN_PROGRESS", tasks: filteredTasks.filter((task) => task.status === "in-progress") },
      { id: "completed", label: "COMPLETED", tasks: filteredTasks.filter((task) => task.status === "completed") },
    ],
    [filteredTasks]
  );

  const handleDragStart = (event: React.DragEvent, taskId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    ArkanAudio.playFast("key_tick_mechanical");
  };

  const handleDrop = async (event: React.DragEvent, status: string) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    setDropStatus(null);

    if (!taskId) {
      return;
    }

    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.status === status) {
      return;
    }

    await updateTask(taskId, {
      status,
      progress: status === "completed" ? 100 : status === "todo" ? 0 : task.progress ?? 45,
    });
    ArkanAudio.playFast("system_execute_clack");
  };

  const handleStatusChange = async (task: Task, status: string) => {
    if (task.status === status) {
      return;
    }

    await updateTask(task.id, {
      status,
      progress: status === "completed" ? 100 : status === "todo" ? 0 : task.progress ?? 45,
    });
    ArkanAudio.playFast("system_execute_clack");
  };

  const handleNewTask = async () => {
    useDialogStore.getState().openDialog({
      title: "NEW_TASK",
      placeholder: "TASK_TITLE",
      confirmLabel: "CREATE_TASK",
      onConfirm: async (value) => {
        const title = value?.trim();
        if (!title) return;

        await addTask({
          title,
          description: "Queued from task archive interface.",
          status: "todo",
          priority: selectedTag === "#security" ? "critical" : selectedTag === "#infra" ? "high" : "medium",
          progress: 0,
          projectId: "global",
          category: (selectedTag !== "ALL" ? selectedTag.replace("#", "") : "GENERAL").toUpperCase(),
          location: "SECTOR_01",
          directory: selectedDirectory === "ALL" ? "/ACTIVE_LOGS" : selectedDirectory,
          tags: selectedTag === "ALL" ? ["#neural"] : [selectedTag],
        });
        ArkanAudio.playFast("system_engage");
      },
    });
  };

  const handleEditTask = (task: Task) => {
    useDialogStore.getState().openDialog({
      title: `EDIT_TASK // ${task.id.slice(-4).toUpperCase()}`,
      placeholder: task.title,
      confirmLabel: "SAVE_TASK",
      onConfirm: async (value) => {
        const title = value?.trim();
        if (!title) return;
        await updateTask(task.id, { title });
        ArkanAudio.playFast("system_execute_clack");
      },
    });
  };

  const handleDeleteTask = (task: Task) => {
    useDialogStore.getState().openDialog({
      title: `DELETE_TASK // ${task.title}`,
      confirmLabel: "DELETE_TASK",
      hideInput: true,
      onConfirm: async () => {
        await deleteTask(task.id);
        ArkanAudio.playFast("system_purge");
      },
    });
  };

  const handleAddSubtask = (task: Task) => {
    useDialogStore.getState().openDialog({
      title: `NEW_SUBTASK // ${task.id.slice(-4).toUpperCase()}`,
      placeholder: "SUBTASK_TITLE",
      confirmLabel: "CREATE_SUBTASK",
      onConfirm: async (value) => {
        const title = value?.trim();
        if (!title) return;
        await addSubtask(task.id, title);
        ArkanAudio.playFast("system_execute_clack");
      },
    });
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    await toggleSubtask(taskId, subtaskId);
    ArkanAudio.playFast("key_tick_mechanical");
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    await deleteSubtask(taskId, subtaskId);
    ArkanAudio.playFast("system_purge");
  };

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-black text-primary font-mono">
      <div className="arkan-grid-overlay opacity-20" />
      <div className="crt-overlay absolute inset-0 opacity-20" />

      <div className="relative z-10 flex h-full min-h-0 w-full overflow-hidden border border-primary/10 bg-black/65">
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-primary/10 bg-[#050502]/90 px-6 py-6">
          <div className="border-b border-primary/10 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[20px] font-semibold italic tracking-tight text-primary">ARKAN<span className="text-white"> //</span> <span className="text-[12px] not-italic">TASK_ARCHIVE_V1.0</span></div>
                <div className="mt-2 inline-flex items-center gap-2 border border-primary/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-primary/75">
                  <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,255,0,0.5)]" />
                  SYSTEM_STABLE
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleNewTask()}
            className="mt-6 border border-primary/45 bg-primary px-4 py-4 text-[12px] font-semibold uppercase tracking-[0.24em] text-black transition hover:brightness-110"
          >
            + NEW_TASK
          </button>

          <div className="mt-8 space-y-8 overflow-y-auto custom-scrollbar">
            <section>
              <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-primary/45">
                <span className="h-3 w-px bg-primary/45" />
                CORE_DIRECTORIES
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedDirectory("ALL")}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] uppercase tracking-[0.16em] transition",
                    selectedDirectory === "ALL" ? "border-l border-primary bg-primary/10 text-primary" : "text-primary/70 hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <span>/ALL_RESOURCES</span>
                  <span className="text-[10px] text-primary/35">{String(tasks.length).padStart(3, "0")}</span>
                </button>
                {directories.map(([directory, count]) => (
                  <button
                    key={directory}
                    type="button"
                    onClick={() => setSelectedDirectory(directory)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] uppercase tracking-[0.16em] transition",
                      selectedDirectory === directory ? "border-l border-primary bg-primary/10 text-primary" : "text-primary/70 hover:bg-primary/5 hover:text-primary"
                    )}
                  >
                    <span>{directory}</span>
                    <span className="text-[10px] text-primary/35">{String(count).padStart(3, "0")}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-primary/45">
                <span className="h-3 w-px bg-primary/45" />
                TAGS_METADATA
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTag("ALL")}
                  className={cn(
                    "border px-3 py-1 text-[10px] uppercase tracking-[0.18em] transition",
                    selectedTag === "ALL" ? "border-primary bg-primary/10 text-primary" : "border-primary/15 text-primary/55 hover:border-primary/40 hover:text-primary"
                  )}
                >
                  #all
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={cn(
                      "border px-3 py-1 text-[10px] uppercase tracking-[0.18em] transition",
                      selectedTag === tag ? "border-primary bg-primary/10 text-primary" : "border-primary/15 text-primary/55 hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-auto border-t border-primary/10 pt-6">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-primary/55">
              <span>SYS_STORAGE</span>
              <span>72.4%</span>
            </div>
            <div className="h-1.5 border border-primary/10 bg-primary/5">
              <div className="h-full w-[72.4%] bg-primary shadow-[0_0_8px_rgba(255,255,0,0.45)]" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-primary/30">
              <span>SECTOR_01 // OK</span>
              <span>992.4 GB</span>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-primary/10 px-6 py-5 xl:justify-between">
            <label className="flex h-14 min-w-[340px] flex-1 items-center gap-3 border border-primary/15 bg-[#050502]/90 px-4 text-primary/35 focus-within:border-primary/40 focus-within:text-primary/65 xl:max-w-[720px]">
              <Search size={16} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="QUERY_ARCHIVE_DATA..."
                className="w-full bg-transparent text-[11px] uppercase tracking-[0.2em] text-white/70 outline-none placeholder:text-white/16"
              />
              <span className="text-[10px] uppercase tracking-[0.18em] text-primary/30">F3_SEARCH</span>
            </label>

            <div className="flex border border-primary/15 bg-[#050502]/90 p-1">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "inline-flex h-10 items-center gap-2 px-3 text-[10px] uppercase tracking-[0.2em] transition",
                  viewMode === "kanban" ? "bg-primary text-black" : "text-primary/55 hover:text-primary"
                )}
              >
                <Columns3 size={14} />
                KANBAN
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "inline-flex h-10 items-center gap-2 px-3 text-[10px] uppercase tracking-[0.2em] transition",
                  viewMode === "list" ? "bg-primary text-black" : "text-primary/55 hover:text-primary"
                )}
              >
                <ListTree size={14} />
                LIST
              </button>
            </div>

            <div className="ml-auto flex items-center gap-8 text-right text-[10px] uppercase tracking-[0.22em] text-primary/75">
              <div>
                <div className="text-white/24">UTC_CLOCK</div>
                <div className="mt-1 text-xl font-semibold text-primary">{formatClock(now)}</div>
              </div>
              <div>
                <div className="text-white/24">UPTIME</div>
                <div className="mt-1 text-xl font-semibold text-primary">{formatRuntime(sessionStart, now)}</div>
              </div>
            </div>
          </div>

          <div className={cn("min-h-0 flex-1 px-6 py-5 custom-scrollbar", viewMode === "kanban" ? "overflow-x-auto overflow-y-hidden" : "overflow-auto")}>
            {viewMode === "kanban" ? (
              <div className="grid h-full min-w-[980px] grid-cols-3 gap-6">
                {columns.map((column) => {
                  const isDropActive = dropStatus === column.id;
                  return (
                    <section
                      key={column.id}
                      className="flex h-full min-h-0 flex-col"
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dropStatus !== column.id) setDropStatus(column.id);
                      }}
                      onDragLeave={() => setDropStatus((current) => (current === column.id ? null : current))}
                      onDrop={(event) => void handleDrop(event, column.id)}
                    >
                      <div className={cn(
                        "mb-5 flex items-center justify-between border-b pb-3",
                        column.id === "in-progress" ? "border-primary/55" : "border-primary/18"
                      )}>
                        <div className={cn(
                          "flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em]",
                          column.id === "completed" ? "text-primary/35" : "text-primary"
                        )}>
                          <span className={cn(
                            "h-2 w-2 rotate-45",
                            column.id === "in-progress" ? "bg-primary shadow-[0_0_8px_rgba(255,255,0,0.4)]" : column.id === "completed" ? "bg-primary/12" : "bg-primary/30"
                          )} />
                          {column.label}
                        </div>
                        <span className={cn(
                          "border px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
                          column.id === "in-progress" ? "border-primary/40 bg-primary/10 text-primary" : column.id === "completed" ? "border-primary/10 bg-primary/5 text-primary/22" : "border-primary/12 bg-primary/5 text-primary/45"
                        )}>
                          CNT_{String(column.tasks.length).padStart(2, "0")}
                        </span>
                      </div>

                      <div className={cn(
                        "flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar transition-colors",
                        column.id === "completed" && "opacity-60 hover:opacity-100",
                        isDropActive && "rounded-sm bg-primary/5"
                      )}>
                        {column.tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onDragStart={handleDragStart}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onAddSubtask={handleAddSubtask}
                            onToggleSubtask={handleToggleSubtask}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <TaskListView
                tasks={filteredTasks}
                onStatusChange={(task, status) => void handleStatusChange(task, status)}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onAddSubtask={handleAddSubtask}
                onToggleSubtask={(taskId, subtaskId) => void handleToggleSubtask(taskId, subtaskId)}
                onDeleteSubtask={(taskId, subtaskId) => void handleDeleteSubtask(taskId, subtaskId)}
              />
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-primary/10 px-6 py-4 text-[10px] uppercase tracking-[0.22em] text-primary/55">
            <div className="flex items-center gap-3 text-primary/85">
              <Shield size={12} />
              READY_FOR_INPUT
            </div>
            <div className="flex flex-wrap items-center gap-4 text-white/28">
              <span>[LOG] FETCHING_TASK_METADATA... SUCCESS</span>
              <span>[SYS] NODE_WASH_4329: ACTIVE</span>
            </div>
            <div className="flex items-center gap-4 text-primary/75">
              <span>SYNC_STATUS: ENCRYPTED_UPLINK</span>
              <span className="inline-flex items-center gap-2"><Signal size={12} /> IP: 192.168.0.254</span>
              <span className="inline-flex items-center gap-2"><Zap size={12} /> 2077 ARKAN SYSTEMS</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
