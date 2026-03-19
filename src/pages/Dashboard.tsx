import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  LayoutGrid,
  Plus,
  Search,
  Terminal as TerminalIcon,
  Trash2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useProjectStore } from "@/store/useProjectStore";
import { useDialogStore } from "@/store/useDialogStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useUIStore } from "@/store/useUIStore";
import { useHardwareMetrics } from "@/store/useHardwareMetrics";
import { useChronosStore } from "@/store/useChronosStore";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { SharedProjectCard } from "@/components/ui/SharedProjectCard";
import { TechnicalGridBackground } from "@/components/ui/TechnicalGridBackground";
import { ProjectHeaderBar, TelemetryStatusCard, CollaboratorsCard } from "@/components/ui/ProjectShared";
import { EntropyModal } from "@/components/ui/EntropyModal";

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function LocalInboxPanel({
  inboxTasks,
  onCollectEntropy,
}: {
  inboxTasks: ReturnType<typeof useTaskStore.getState>["tasks"];
  onCollectEntropy: () => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border border-primary/15 bg-[#070704]/90">
      <div className="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
          <Database className="h-3.5 w-3.5" />
          GLOBAL_INBOX
        </div>
        <span className="border border-primary/15 bg-black/50 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] text-primary/55">
          {inboxTasks.length}_ITEMS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {inboxTasks.length ? (
          <div className="space-y-3">
            {inboxTasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className="border border-primary/10 bg-black/40 p-3 transition-all hover:border-primary/35 hover:bg-primary/[0.04]"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[8px] uppercase tracking-[0.18em] text-primary/30">
                    {task.priority?.toUpperCase() ?? "STANDARD"}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.18em] text-primary/25">
                    {task.status?.toUpperCase() ?? "TODO"}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-[0.14em] text-primary/75">
                  {task.title}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 border border-primary/10 bg-black/30 text-center">
            <div className="h-14 w-14 rounded-full border border-primary/10 bg-primary/[0.03]" />
            <div className="text-[10px] uppercase tracking-[0.32em] text-primary/18">PROTOCOL_CLEAR</div>
          </div>
        )}
      </div>

      <div className="border-t border-primary/10 bg-black/60 p-4">
        <button
          type="button"
          onClick={onCollectEntropy}
          className="w-full border border-primary/20 bg-primary/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-primary transition-all hover:bg-primary hover:text-black"
        >
          COLLECT_ENTROPY
        </button>
      </div>
    </aside>
  );
}

function RightMetricsPanel({
  uptime,
  quickNote,
  onQuickNoteChange,
  sessionId,
}: {
  uptime: string;
  quickNote: string;
  onQuickNoteChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sessionId: string;
}) {
  return (
    <aside className="flex min-h-0 flex-col gap-3">
      <div className="border border-primary/15 bg-[#070704]/90 p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary/65">
          <Activity className="h-3.5 w-3.5" />
          SYSTEM_UPTIME
        </div>
        <div className="font-mono text-[32px] font-black tracking-[0.1em] text-primary">{uptime}</div>
      </div>

      <div className="flex min-h-[260px] flex-1 flex-col overflow-hidden border border-primary/15 bg-[#070704]/90">
        <div className="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">QUICK_BUFFER</span>
          <div className="h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_8px_rgba(255,255,0,0.45)]" />
        </div>
        <textarea
          className="flex-1 resize-none bg-transparent p-4 text-[10px] uppercase tracking-[0.16em] text-primary/70 outline-none placeholder:text-primary/20"
          placeholder="> ENTER_TEMPORAL_DATA..."
          value={quickNote}
          onChange={onQuickNoteChange}
          spellCheck={false}
        />
      </div>

      <div className="border border-primary/15 bg-[#070704]/90 p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary/65">
          <Clock className="h-3.5 w-3.5" />
          SESSION_ID
        </div>
        <div className="break-all text-[9px] uppercase tracking-[0.18em] text-primary/45">{sessionId}</div>
      </div>
    </aside>
  );
}

function FooterTelemetry({
  logs,
  cpuUsage,
  memUsage,
  netSpeed,
}: {
  logs: { id: string; message: string; timestamp: string }[];
  cpuUsage: number;
  memUsage: string;
  netSpeed: string;
}) {
  return (
    <footer className="relative z-10 grid gap-3 border-t border-primary/15 bg-black/80 px-4 py-4 md:px-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]">
      <div className="min-h-[88px] overflow-hidden border border-primary/15 bg-[#070704]/90">
        <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary/65">
            <TerminalIcon className="h-3.5 w-3.5" />
            LOGS
          </div>
          <span className="text-[8px] uppercase tracking-[0.18em] text-primary/25">LIVE_STREAM</span>
        </div>
        <div className="space-y-1 px-4 py-3 text-[9px] uppercase tracking-[0.14em] text-primary/45">
          {logs.length ? (
            logs.slice(0, 3).map((log) => (
              <div key={log.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                <span className="text-primary/25">[{log.timestamp}]</span>
                <span className="truncate">[SYSTEM] {log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-primary/20">[SYSTEM] AWAITING_LOG_STREAM...</div>
          )}
        </div>
      </div>

      <div className="border border-primary/15 bg-[#070704]/90 p-4">
        <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.22em] text-primary/35">CPU_CORE_LOAD</div>
        <div className="mb-2 flex items-end justify-between text-primary">
          <span className="text-2xl font-black">{cpuUsage}%</span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-primary/45">MEM_POOL</span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-primary/10">
          <div className="h-full bg-primary shadow-[0_0_10px_rgba(255,255,0,0.45)]" style={{ width: `${Math.min(cpuUsage, 100)}%` }} />
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-primary/55">{memUsage}</div>
      </div>

      <div className="border border-primary/15 bg-[#070704]/90 p-4">
        <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.22em] text-primary/35">UPLINK_STATUS</div>
        <div className="mb-2 text-xl font-black uppercase tracking-[0.12em] text-primary">DATA_SYNC</div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-primary/55">
          <span className="h-2 w-2 rounded-full bg-primary/70" />
          NOMINAL
        </div>
        <div className="mt-3 text-[9px] uppercase tracking-[0.18em] text-primary/35">NET: {netSpeed}</div>
      </div>
    </footer>
  );
}

export default function DashboardPage() {
  const projects = useProjectStore((state) => state.projects);
  const tasks = useTaskStore((state) => state.tasks);
  const { setIsNewProjectModalOpen } = useUIStore();
  const globalSearchQuery = useSearchStore((state) => state.query);
  const setGlobalSearchQuery = useSearchStore((state) => state.setQuery);
  const toggleSearch = useSearchStore((state) => state.toggleSearch);
  const updateMetrics = useHardwareMetrics((state) => state.updateMetrics);
  const hardwareMetrics = useHardwareMetrics((state) => state.metrics);
  const heartbeatMs = useChronosStore((state) => state.heartbeatMs);
  const cpuUsage = useChronosStore((state) => state.cpuUsage);
  const memUsage = useChronosStore((state) => state.memUsage);
  const netSpeed = useChronosStore((state) => state.netSpeed);
  const logs = useSystemLogStore((state) => state.logs);

  const [activeView, setActiveView] = useState<"GRID" | "PROJECT_EXPANDED">("GRID");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [isEntropyModalOpen, setIsEntropyModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const sessionStartRef = useRef(Date.now());
  const sessionId = useMemo(
    () => `${sessionStartRef.current}-${Math.floor(Math.random() * 9000 + 1000)}`,
    []
  );

  const handleDeleteProject = (event: React.MouseEvent, id: string, name: string) => {
    event.stopPropagation();
    ArkanAudio.playFast("system_engage");
    useDialogStore.getState().openDialog({
      title: `PURGE PROTOCOL // ${name}`,
      confirmLabel: "PURGE_DATA",
      hideInput: true,
      onConfirm: async () => {
        await useProjectStore.getState().deleteProject(id);
        ArkanAudio.playFast("system_purge");
      },
    });
  };

  useEffect(() => {
    const bootTimer = window.setTimeout(() => setIsLoading(false), 650);
    const savedNote = window.localStorage.getItem("arkan_quick_note");
    if (savedNote) {
      setQuickNote(savedNote);
    }

    updateMetrics();

    return () => window.clearTimeout(bootTimer);
  }, [updateMetrics]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setNow(Date.now()), 1000);
    const metricsInterval = window.setInterval(updateMetrics, 6000);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(metricsInterval);
    };
  }, [updateMetrics]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }

    const normalized = searchQuery.toLowerCase();
    return projects.filter((project) =>
      project.name.toLowerCase().includes(normalized) ||
      project.technicalId.toLowerCase().includes(normalized) ||
      (project.status ?? "").toLowerCase().includes(normalized)
    );
  }, [projects, searchQuery]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const inboxTasks = useMemo(
    () => tasks.filter((task) => !task.projectId || task.projectId === "inbox" || task.projectId === "null"),
    [tasks]
  );

  const uptime = useMemo(() => formatElapsed(now - sessionStartRef.current), [now]);
  const localTime = useMemo(
    () => new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    [now]
  );

  const handleQuickNoteChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuickNote(event.target.value);
    window.localStorage.setItem("arkan_quick_note", event.target.value);
  };

  const handleInitProject = () => {
    ArkanAudio.playFast("system_engage");
    setIsNewProjectModalOpen(true);
  };

  const handleLaunchOmniSearch = () => {
    const query = (globalSearchQuery || searchQuery || "PROTOCOL").trim();
    setGlobalSearchQuery(query);
    toggleSearch(true);
    ArkanAudio.playFast("confirm");
  };

  const expandProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView("PROJECT_EXPANDED");
  };

  const returnToGrid = () => {
    setSelectedProjectId(null);
    setActiveView("GRID");
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black font-mono text-primary">
      <TechnicalGridBackground />

      <header className="relative z-10 space-y-3 border-b border-primary/15 bg-black/75 px-4 py-4 backdrop-blur-sm md:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4 border border-primary/15 bg-[#070704]/90 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-primary/60">
            <div className="flex items-center gap-2 font-bold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary/80" />
              SYSTEM_STATUS: OPTIMAL
            </div>
            <span>CPU: {hardwareMetrics.cpu}%</span>
            <span>MEM: {hardwareMetrics.ram.toFixed(1)}GB</span>
            <span>NET: {netSpeed}</span>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 xl:max-w-[520px]">
            <div className="relative min-w-0 flex-1 xl:max-w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/25" />
              <input
                value={globalSearchQuery}
                onChange={(event) => setGlobalSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleLaunchOmniSearch();
                  }
                }}
                placeholder="CROWK_TO_SEARCH"
                className="w-full border border-primary/15 bg-black/50 py-2 pl-9 pr-3 text-[10px] uppercase tracking-[0.18em] text-primary/75 outline-none transition-colors placeholder:text-primary/18 hover:border-primary/30 focus:border-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={handleLaunchOmniSearch}
              className="border border-primary/15 bg-primary/10 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.24em] text-primary transition-all hover:border-primary/40 hover:bg-primary/20"
            >
              CMD+K
            </button>
            <div className="border border-primary/15 bg-black/50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.24em] text-primary/75">
              ARKAN_USER
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4 border border-primary/10 bg-[#070704]/70 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-primary/55">
            <div className="flex items-center gap-2 text-primary/85">
              <span className="h-2 w-2 rounded-full bg-primary/70" />
              SYSTEM_STATUS: OPERATIONAL
            </div>
            <span>ARK_CORE_0B: NOMINAL</span>
            <span>LATENCY: {heartbeatMs.toFixed(0)}MS</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.2em] text-primary/45">
            <button
              type="button"
              onClick={handleLaunchOmniSearch}
              className="border border-primary/15 bg-black/40 px-3 py-2 font-bold text-primary/65 transition-all hover:border-primary/35 hover:text-primary"
            >
              SEARCH CMD+K
            </button>
            <span className="border border-primary/10 px-3 py-2">AL</span>
            <span className="border border-primary/10 px-3 py-2">LOCAL_TIME {localTime}</span>
          </div>
        </div>

        {activeView === "GRID" && (
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4 border border-primary/10 bg-[#070704]/70 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary/45">SEARCH_ACTIVE_OPERATIONS...</div>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/20" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="SEARCH_ACTIVE_OPERATIONS..."
                  className="w-full border border-primary/10 bg-black/45 py-2 pl-9 pr-3 text-[10px] uppercase tracking-[0.16em] text-primary/70 outline-none transition-colors placeholder:text-primary/18 hover:border-primary/25 focus:border-primary/40"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleInitProject}
              className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-black shadow-[0_0_18px_rgba(255,255,0,0.24)] transition-all hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" />
              INIT_PROJECT
            </button>
          </div>
        )}
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="dashboard-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center px-6"
            >
              <div className="flex flex-col items-center gap-4 border border-primary/15 bg-[#070704]/90 px-10 py-12 text-center">
                <Cpu className="h-10 w-10 animate-spin text-primary" />
                <span className="text-[11px] uppercase tracking-[0.32em] text-primary/70">ESTABLISHING_UPLINK...</span>
              </div>
            </motion.div>
          ) : activeView === "PROJECT_EXPANDED" && selectedProject ? (
            <motion.div
              key={`dashboard-project-${selectedProject.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6"
            >
              <ProjectHeaderBar
                projectName={selectedProject.name}
                uptime={now - sessionStartRef.current}
                onBack={returnToGrid}
              />

              <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
                <section className="hidden w-[280px] min-h-0 flex-col overflow-hidden rounded-sm border border-primary/10 bg-[#1a1a0a]/50 xl:flex">
                  <div className="flex items-center justify-between border-b border-primary/10 bg-primary/5 p-4">
                    <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-primary">OPERATIONS_LOG</h2>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-primary/40">Priority: CRITICAL</label>
                      <div className="border border-primary/20 bg-primary/5 p-3">
                        <p className="text-sm font-medium text-white/90">Initialize Neural Sync Protocols</p>
                        <p className="mt-1 text-[10px] text-primary/40">Status: DEPLOYED // ID: 882-QX</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-primary/40">Priority: PENDING</label>
                      <div className="border border-white/5 bg-white/5 p-3">
                        <p className="text-sm font-medium text-white/70">Refactor Core Logic v2.4</p>
                        <p className="mt-1 text-[10px] text-primary/40">Assignee: ARKAN_CORE</p>
                      </div>
                    </div>
                    <button className="w-full border border-dashed border-primary/20 py-2 text-[10px] uppercase tracking-[0.2em] text-primary/60 transition-all hover:bg-primary/5 hover:text-primary">
                      + ADD_NEW_OPERATION
                    </button>
                  </div>
                </section>

                <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-primary/10 bg-[#1a1a0a]/50">
                  <div className="flex items-center justify-between border-b border-primary/10 p-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">ARCHIVE_DOC // CORE_SPECS.md</h2>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-primary/40">MODE: LIVE_MARKDOWN</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-relaxed custom-scrollbar">
                    <div className="mx-auto max-w-2xl space-y-6">
                      <div className="border-l-2 border-primary py-1 pl-4">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-white">{selectedProject.name}</h1>
                      </div>
                      <p className="text-primary/60">
                        The implementation of the <code className="bg-primary/10 px-1 text-primary">{selectedProject.technicalId}</code> architecture focuses on decentralized data
                        processing and sub-second decision making within the Arkan environment.
                      </p>

                      <div className="border border-primary/10 bg-black/40 p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">Key Objectives</h3>
                        <ul className="space-y-2 text-xs text-primary/60">
                          <li className="flex items-center gap-2"><span className="text-primary">01.</span> Latency reduction in neural sync protocols.</li>
                          <li className="flex items-center gap-2"><span className="text-primary">02.</span> Encryption hardening via quantum-resistant algorithms.</li>
                          <li className="flex items-center gap-2"><span className="text-primary">03.</span> API integration for external telemetry node clusters.</li>
                        </ul>
                      </div>

                      <div className="my-8 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

                      <h2 className="text-lg font-bold uppercase text-white/90">Operational Roadmap</h2>
                      <p className="text-primary/60">
                        Current progress suggests a stable deployment within the next 48 hours. Monitoring nodes are active in the EMEA and APAC regions.
                      </p>

                      <div className="relative mt-6 flex h-40 w-full items-center justify-center overflow-hidden rounded-sm border border-primary/10 bg-primary/5">
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage:
                              "linear-gradient(rgba(249, 249, 6, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 249, 6, 0.2) 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }}
                        />
                        <span className="text-primary/40">SCHEMATIC: NODE_CLUSTER_ALPHA_7</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="hidden w-[260px] flex-col gap-6 xl:flex">
                  <TelemetryStatusCard progress={selectedProject.progress || 0} />
                  <CollaboratorsCard />
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 py-4 md:px-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_220px]"
            >
              <LocalInboxPanel inboxTasks={inboxTasks} onCollectEntropy={() => setIsEntropyModalOpen(true)} />

              <main className="flex min-h-0 flex-col overflow-hidden border border-primary/15 bg-[#050503]/92">
                <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-4 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <LayoutGrid className="h-4 w-4" />
                      <h1 className="text-xl font-black uppercase italic tracking-[0.08em]">ACTIVE_OPERATIONS</h1>
                    </div>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-primary/45">
                      COMMAND_CENTER // VIEWING_{filteredProjects.length}_ACTIVE_MODULES
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-primary/45">
                    <span className="h-2 w-2 rounded-sm bg-primary/80" />
                    GRID_LAYOUT_ACTIVE
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    <button
                      type="button"
                      onClick={handleInitProject}
                      onMouseEnter={() => ArkanAudio.play("ui_hover_shimmer")}
                      className="group flex h-52 flex-col items-center justify-center gap-4 border border-dashed border-primary/20 bg-primary/[0.02] text-primary/35 transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 transition-transform group-hover:scale-110 group-hover:border-primary/50">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.24em]">INITIALIZE_NEW_MODULE</span>
                    </button>

                    {filteredProjects.map((project) => (
                      <SharedProjectCard
                        key={project.id}
                        project={project}
                        onExpand={expandProject}
                        onDelete={handleDeleteProject}
                        onHoverSound={() => ArkanAudio.play("ui_hover_shimmer")}
                        variant="compact"
                      />
                    ))}
                  </div>

                  {!filteredProjects.length && (
                    <div className="mt-3 flex min-h-[240px] flex-col items-center justify-center border border-primary/10 bg-black/30 text-center">
                      <Search className="mb-4 h-8 w-8 text-primary/20" />
                      <div className="text-[10px] uppercase tracking-[0.32em] text-primary/30">NO_ACTIVE_MODULES_MATCH_SEARCH</div>
                    </div>
                  )}
                </div>
              </main>

              <div className="hidden xl:block">
                <RightMetricsPanel
                  uptime={uptime}
                  quickNote={quickNote}
                  onQuickNoteChange={handleQuickNoteChange}
                  sessionId={sessionId}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FooterTelemetry logs={logs} cpuUsage={cpuUsage} memUsage={memUsage} netSpeed={netSpeed} />

      <EntropyModal isOpen={isEntropyModalOpen} onClose={() => setIsEntropyModalOpen(false)} />
    </div>
  );
}
