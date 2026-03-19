import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Cpu,
  FileText,
  FolderKanban,
  Link2,
  Search,
  StickyNote,
  Terminal,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { buildSearchDocuments, type SearchMatch, searchDocuments, type SearchPriority, type SearchSource } from "@/lib/search";
import { useChronosStore } from "@/store/useChronosStore";
import { useHardwareMetrics } from "@/store/useHardwareMetrics";
import { useNoteStore } from "@/store/useNoteStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { useTaskStore } from "@/store/useTaskStore";

const SOURCE_LABELS: Record<SearchSource, string> = {
  TASKS_ARCHIVE: "TASKS_ARCHIVE",
  NEURAL_NOTES: "NEURAL_NOTES",
  CORE_PROJECTS: "CORE_PROJECTS",
  LEGACY_COMMS: "LEGACY_COMMS",
};

const SOURCE_ICON = {
  TASKS_ARCHIVE: FolderKanban,
  NEURAL_NOTES: StickyNote,
  CORE_PROJECTS: FileText,
  LEGACY_COMMS: Terminal,
} as const;

const PRIORITY_OPTIONS: Array<SearchPriority | "ALL"> = ["CRITICAL", "HIGH_VAL", "STANDARD", "ARCHIVED"];
const DEFAULT_SOURCES: Record<SearchSource, boolean> = {
  TASKS_ARCHIVE: true,
  NEURAL_NOTES: true,
  CORE_PROJECTS: true,
  LEGACY_COMMS: false,
};

function downloadFile(filename: string, payload: string, type: string) {
  const blob = new Blob([payload], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatRelative(updatedAt: string) {
  const timestamp = new Date(updatedAt).getTime();
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}M_AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H_AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D_AGO`;
}

function highlightText(text: string, query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return <>{text}</>;

  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = terms.some((term) => part.toLowerCase() === term.toLowerCase());

        return isMatch ? (
          <span key={`${part}-${index}`} className="bg-primary px-1 text-black">{part}</span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramQuery = searchParams.get("q") ?? "";
  const storedQuery = useSearchStore((state) => state.query);
  const setStoredQuery = useSearchStore((state) => state.setQuery);

  const projects = useProjectStore((state) => state.projects);
  const tasks = useTaskStore((state) => state.tasks);
  const notes = useNoteStore((state) => state.nodes);
  const setSelectedNodeId = useNoteStore((state) => state.setSelectedNodeId);
  const logs = useSystemLogStore((state) => state.logs);
  const addLog = useSystemLogStore((state) => state.addLog);

  const metrics = useHardwareMetrics((state) => state.metrics);
  const updateMetrics = useHardwareMetrics((state) => state.updateMetrics);
  const heartbeatMs = useChronosStore((state) => state.heartbeatMs);

  const initialQuery = paramQuery || storedQuery || "PROTOCOL";
  const [query, setQuery] = useState(initialQuery);
  const [sourceFilters, setSourceFilters] = useState<Record<SearchSource, boolean>>(DEFAULT_SOURCES);
  const [priorityFilter, setPriorityFilter] = useState<SearchPriority | "ALL">("ALL");
  const [fromIso, setFromIso] = useState("2023-11-01T09:00");
  const [toIso, setToIso] = useState("");

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 6000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  useEffect(() => {
    const nextQuery = paramQuery || storedQuery || "PROTOCOL";
    if (nextQuery && nextQuery !== query) {
      setQuery(nextQuery);
    }
  }, [paramQuery, query, storedQuery]);

  useEffect(() => {
    setStoredQuery(query);

    if (paramQuery === query.trim()) {
      return;
    }

    startTransition(() => {
      const next = new URLSearchParams(searchParams);
      if (query.trim()) {
        next.set("q", query);
      } else {
        next.delete("q");
      }
      setSearchParams(next, { replace: true });
    });
  }, [paramQuery, query, searchParams, setSearchParams, setStoredQuery]);

  const documents = useMemo(() => buildSearchDocuments({ projects, tasks, notes, logs }), [logs, notes, projects, tasks]);

  const enabledSources = useMemo(
    () => (Object.entries(sourceFilters).filter(([, enabled]) => enabled).map(([source]) => source as SearchSource)),
    [sourceFilters]
  );

  const results = useMemo(() => searchDocuments(documents, deferredQuery, {
    sources: enabledSources,
    priority: priorityFilter,
    from: fromIso,
    to: toIso || undefined,
  }), [deferredQuery, documents, enabledSources, fromIso, priorityFilter, toIso]);

  const analyticsBars = useMemo(() => {
    const topScores = results.slice(0, 8).map((result) => result.score);
    const peak = Math.max(...topScores, 1);
    return topScores.length ? topScores.map((score) => Math.max(22, Math.round((score / peak) * 100))) : [28, 44, 35, 86, 60, 40, 48, 30];
  }, [results]);

  const execTime = useMemo(() => {
    const sourcePenalty = enabledSources.length * 9;
    const queryPenalty = Math.max(0, deferredQuery.trim().length) * 6;
    return Math.min(420, 48 + sourcePenalty + queryPenalty + results.length * 7);
  }, [deferredQuery, enabledSources.length, results.length]);

  const footerCount = results.length;

  const openResult = (result: SearchMatch) => {
    if (result.source === "NEURAL_NOTES") {
      setSelectedNodeId(result.id);
    }

    navigate(result.route);
    ArkanAudio.playFast("system_execute_clack");
    addLog(`SEARCH_RESULT_OPENED: ${result.technicalId}`, "system");
  };

  const handleExportReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      query,
      priorityFilter,
      enabledSources,
      results,
    };

    downloadFile("arkan-search-report.json", JSON.stringify(payload, null, 2), "application/json");
    ArkanAudio.playFast("system_execute_clack");
    addLog("SEARCH_REPORT_EXPORTED", "system");
  };

  const handleDiagnostics = () => {
    updateMetrics();
    ArkanAudio.playFast("system_engage");
    addLog(`SEARCH_DIAGNOSTICS_OK: ${results.length}_MATCHES_SCANNED`, "status");
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-black font-mono text-white selection:bg-primary selection:text-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,0,0.07)_1px,transparent_0)] bg-[size:24px_24px] opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.035)_1px,transparent_1px)] bg-[size:40px_40px] opacity-15" />

      <header className="relative z-10 border-b border-primary/15 bg-black/85 backdrop-blur-sm">
        <div className="flex flex-col gap-5 px-4 py-5 md:px-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.28em] text-primary/45">SYSTEM_QUERY // SEARCH_RESULTS</div>
            <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="bg-primary px-4 py-3 text-xl font-black uppercase tracking-[0.1em] text-black shadow-[0_0_20px_rgba(255,255,0,0.2)]">
                SEARCH: [{query.trim() || "GLOBAL_INDEX"}]
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-primary">
                <span className="border border-primary/25 bg-black/35 px-3 py-2">QUERY_MODE: DEEP_SCAN</span>
                <span className="border border-primary/25 bg-black/35 px-3 py-2">EXEC_TIME: {execTime}MS</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <button
              type="button"
              onClick={handleExportReport}
              className="border border-primary/35 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary transition-all hover:bg-primary hover:text-black"
            >
              EXPORT_REPORT
            </button>
            <button
              type="button"
              onClick={handleDiagnostics}
              className="border border-primary/35 bg-primary/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary transition-all hover:bg-primary/20"
            >
              RUN_DIAGNOSTICS
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 border-t border-primary/10 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-y-auto border-b border-primary/10 bg-black/45 p-5 custom-scrollbar xl:border-b-0 xl:border-r xl:border-primary/10 xl:p-8">
          <div className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary/75">
            <span className="h-2 w-2 bg-primary" />
            FILTER_PARAMETERS
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.24em] text-primary/38">SEARCH_VECTOR</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/30" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value.toUpperCase())}
                  placeholder="PROJECT_ORION"
                  className="w-full border border-primary/20 bg-black/55 py-3 pl-10 pr-3 text-sm font-black uppercase tracking-[0.12em] text-primary outline-none transition-colors placeholder:text-primary/18 focus:border-primary/55"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.24em] text-primary/38">SOURCE_CATEGORIES</label>
              <div className="space-y-2">
                {(Object.keys(SOURCE_LABELS) as SearchSource[]).map((source) => (
                  <label key={source} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sourceFilters[source]}
                      onChange={() => setSourceFilters((current) => ({ ...current, [source]: !current[source] }))}
                      className="h-4 w-4 rounded-none border-primary/35 bg-transparent text-primary focus:ring-0"
                    />
                    <span className={cn("text-[11px] font-bold uppercase tracking-[0.14em]", sourceFilters[source] ? "text-white/80" : "text-white/30")}>{SOURCE_LABELS[source]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-primary/10 pt-6">
              <label className="text-[10px] uppercase tracking-[0.24em] text-primary/38">PRIORITY_LEVEL</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {PRIORITY_OPTIONS.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setPriorityFilter(priority)}
                    className={cn(
                      "border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all",
                      priorityFilter === priority
                        ? "border-primary bg-primary text-black"
                        : "border-primary/18 bg-black/25 text-primary/55 hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    {priority}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPriorityFilter("ALL")}
                  className={cn(
                    "col-span-2 border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all",
                    priorityFilter === "ALL"
                      ? "border-primary bg-primary text-black"
                      : "border-primary/18 bg-black/25 text-primary/55 hover:border-primary/40 hover:text-primary"
                  )}
                >
                  ALL_LEVELS
                </button>
              </div>
            </div>

            <div className="border-t border-primary/10 pt-6">
              <label className="text-[10px] uppercase tracking-[0.24em] text-primary/38">TIMEFRAME_VECTOR</label>
              <div className="mt-3 space-y-2">
                <div className="border border-primary/10 bg-primary/[0.04] p-3">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-primary/35">FROM_ISO</div>
                  <input
                    type="datetime-local"
                    value={fromIso}
                    onChange={(event) => setFromIso(event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm uppercase text-white/80 outline-none"
                  />
                </div>
                <div className="border border-primary/10 bg-primary/[0.04] p-3">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-primary/35">TO_ISO</div>
                  <input
                    type="datetime-local"
                    value={toIso}
                    onChange={(event) => setToIso(event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm uppercase text-white/80 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="overflow-y-auto bg-black/20 p-5 custom-scrollbar sm:p-6 md:p-8">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[0.2em] text-primary/55">
              <div className="flex flex-wrap items-center gap-5">
                <MetricStat icon={Cpu} label="CPU_LOAD" value={`${metrics.cpu}%`} />
                <MetricStat icon={FileText} label="MEM_ALLOC" value={`${metrics.ram.toFixed(1)}GB / 32GB`} />
                <MetricStat icon={Wifi} label="NET_STATUS" value="ENCRYPTED" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-white text-sm font-black tracking-[0.16em]">OPERATOR_01</div>
                  <div className="text-[9px] text-primary/45">SYSTEM_ADMIN</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center border border-primary/20 bg-primary/10 text-primary">01</div>
              </div>
            </div>

            {results.map((result) => {
              const Icon = SOURCE_ICON[result.source];

              return (
                <article
                  key={`${result.source}-${result.id}`}
                  className="group cursor-pointer border border-primary/18 bg-primary/[0.03] p-6 transition-all hover:border-primary/55 hover:bg-primary/[0.06]"
                  onClick={() => openResult(result)}
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <span className="border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">#{result.technicalId}</span>
                      <div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-primary/45">
                        {result.breadcrumb.map((item, index) => (
                          <React.Fragment key={`${item}-${index}`}>
                            {index > 0 && <ChevronRight className="h-3 w-3 text-primary/25" />}
                            <span className={cn(index === result.breadcrumb.length - 1 && "text-primary/75 underline decoration-primary/30")}>{item}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-primary/45">
                      <span>UPDATED: {formatRelative(result.updatedAt)}</span>
                      <span className={cn(
                        result.priority === "CRITICAL" ? "text-red-400" : result.priority === "HIGH_VAL" ? "text-primary" : "text-primary/45"
                      )}>{result.priority}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="mt-1 hidden border border-primary/18 bg-black/35 p-2 text-primary/55 lg:block">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-black leading-tight tracking-[0.01em] text-white transition-colors group-hover:text-primary">
                        {highlightText(result.title, deferredQuery)}
                      </h3>
                      <p className="mt-3 max-w-4xl text-base leading-relaxed text-white/60">
                        {highlightText(result.snippet || result.content.slice(0, 200), deferredQuery)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {result.tags.map((tag) => (
                          <span key={tag} className="border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/45">{tag}</span>
                        ))}
                        <span className="ml-auto inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-primary/55">
                          OPEN_NODE <Link2 className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {results.length === 0 && (
              <div className="border border-primary/12 bg-primary/[0.03] p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/15 bg-black/35 text-primary/45">
                  <Search className="h-5 w-5" />
                </div>
                <div className="mt-5 text-[11px] uppercase tracking-[0.28em] text-primary/45">NO_SYSTEM_NODES_MATCHED_CURRENT_FILTERS</div>
              </div>
            )}

            <div className="border border-primary/10 bg-primary/[0.05] p-8">
              <div className="mb-5 text-center text-[10px] uppercase tracking-[0.22em] text-primary/55">ANALYTICS_OVERLAY_V2.0 // SEARCH_RELEVANCY_DISTRIBUTION</div>
              <div className="flex h-28 items-end gap-2 px-4 sm:px-12">
                {analyticsBars.map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className={cn(
                      "flex-1 border-t transition-all",
                      index === Math.floor(analyticsBars.length / 2)
                        ? "border-primary bg-primary text-black"
                        : "border-primary/40 bg-primary/20"
                    )}
                    style={{ height: `${height}%` }}
                  >
                    {index === Math.floor(analyticsBars.length / 2) ? (
                      <div className="-mt-6 text-center text-[10px] uppercase tracking-[0.16em] text-primary">PEAK_SIGNAL</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="relative z-10 flex flex-col gap-3 border-t border-primary/20 bg-black px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-primary md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 font-black">
            <span className="h-2 w-2 rounded-full bg-primary" />
            QUERY_COMPLETE: {footerCount}_MATCHES_FOUND
          </div>
          <span className="text-primary/55">SYSTEM_INDEX: OPTIMIZED</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-primary/55 md:gap-6">
          <span>DB_CLUSTER_B77</span>
          <span>UPLINK_STABLE</span>
          <div className="flex items-end gap-1">
            <span className="h-3 w-1 bg-primary" />
            <span className="h-3 w-1 bg-primary" />
            <span className="h-3 w-1 bg-primary" />
            <span className="h-3 w-1 bg-primary/20" />
            <span className="h-3 w-1 bg-primary/20" />
          </div>
        </div>
      </footer>

      <div className="pointer-events-none absolute bottom-14 right-8 hidden h-28 w-28 items-center justify-center rounded-full border border-primary/15 opacity-20 xl:flex">
        <div className="h-20 w-20 animate-spin rounded-full border border-dashed border-primary/35" />
        <div className="absolute -bottom-5 text-[8px] uppercase tracking-[0.18em] text-primary">GRID_SYNC_77%</div>
      </div>
    </div>
  );
}

function MetricStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-primary/45" />
      <span>{label}</span>
      <span className="text-primary">{value}</span>
    </div>
  );
}





