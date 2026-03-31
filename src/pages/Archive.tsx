import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw as Sync, Archive as ArchiveIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { TechnicalGridBackground } from "@/components/ui/TechnicalGridBackground";
import { isAuthBypassed } from "@/lib/auth";

interface ArchivedNode {
  id: string;
  title: string;
  type: "TASK" | "PROJECT" | "LOGISTIC";
  de_manifested_timestamp: string;
  status: string;
  original_collection: string;
}

const LOCAL_ARCHIVED_NODES: ArchivedNode[] = [
  {
    id: "local-archive-1",
    title: "OPS RETROSPECTIVE",
    type: "TASK",
    de_manifested_timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: "ARCHIVED",
    original_collection: "tasks",
  },
  {
    id: "local-archive-2",
    title: "ORBITAL STATION AUDIT",
    type: "PROJECT",
    de_manifested_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    status: "ARCHIVED",
    original_collection: "projects",
  },
];

function resolveArchiveTimestamp(record: any) {
  return record.archived_at || record.updated_at || record.updatedAt || new Date().toISOString();
}

export default function ArchivePage() {
  const [nodes, setNodes] = useState<ArchivedNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const addLog = useSystemLogStore((state) => state.addLog);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    addLog(">> SCANNING_HISTORICAL_CHANNELS...", "system");

    try {
      if (isAuthBypassed) {
        setNodes(LOCAL_ARCHIVED_NODES);
        addLog(`>> LOCAL_TEST_SCAN_COMPLETE: ${LOCAL_ARCHIVED_NODES.length}_NODES_IDENTIFIED`, "system");
        return;
      }

      const [tasksRes, projectsRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("is_archived", true),
        supabase.from("projects").select("*").eq("is_archived", true),
      ]);

      const unifiedNodes: ArchivedNode[] = [
        ...((tasksRes.data as any[]) || []).map((task) => ({
          id: task.id,
          title: task.title,
          type: "TASK" as const,
          de_manifested_timestamp: resolveArchiveTimestamp(task),
          status: String(task.status || "archived").toUpperCase(),
          original_collection: "tasks",
        })),
        ...((projectsRes.data as any[]) || []).map((project) => ({
          id: project.id,
          title: project.name,
          type: "PROJECT" as const,
          de_manifested_timestamp: resolveArchiveTimestamp(project),
          status: String(project.status || "archived").toUpperCase(),
          original_collection: "projects",
        })),
      ];

      unifiedNodes.sort(
        (a, b) => new Date(b.de_manifested_timestamp).getTime() - new Date(a.de_manifested_timestamp).getTime()
      );

      setNodes(unifiedNodes);
      addLog(`>> SCAN_COMPLETE: ${unifiedNodes.length}_NODES_IDENTIFIED`, "system");
    } catch {
      addLog(">> SCAN_INTERRUPTED: CHANNEL_ERROR", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const restoreNode = async (id: string, collection: string) => {
    addLog(`>> INITIATING_RE-MANIFESTATION: NODE_${id.slice(0, 8)}`, "system");
    ArkanAudio.play("restore_ascending_ping");

    if (isAuthBypassed) {
      addLog(`LOCAL_TEST_RESTORE: NODE_${id.slice(0, 8)} RETURNED_TO_ACTIVE_VIEW`, "status");
      setNodes((prev) => prev.filter((node) => node.id !== id));
      return;
    }

    const restoreStatus = collection === "projects" ? "active" : "todo";

    const { error } = await supabase
      .from(collection)
      .update({ is_archived: false, archived_at: null, status: restoreStatus })
      .eq("id", id);

    if (!error) {
      addLog(`SUCCESS: NODE_${id.slice(0, 8)} RESTORED_TO_ACTIVE_DASHBOARD`, "system");
      setNodes((prev) => prev.filter((node) => node.id !== id));
    } else {
      addLog(`RESTORE_FAILED: ${error.message}`, "error");
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black font-mono text-primary/40 selection:bg-primary selection:text-black">
      <TechnicalGridBackground />

      <main className="relative z-10 flex flex-1 flex-col overflow-hidden p-8">
        <div className="mb-8">
          <h1 className="mb-2 text-sm font-bold uppercase italic tracking-[0.2em] text-white">
            Historical_Archive // Indexed
          </h1>
          <div className="h-px w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent"></div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-sm border border-primary/20 bg-black/40 custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-30 bg-black">
              <tr className="border-b border-primary/20">
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-primary/60">[ID_TAG]</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-primary/60">[TYPE]</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-primary/60">[DE-MANIFESTED_TIMESTAMP]</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-primary/60">[STATUS]</th>
                <th className="p-4 text-right text-[10px] font-bold uppercase tracking-widest text-primary/60">ACTION</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {nodes.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <ArchiveIcon className="h-12 w-12" />
                        <span className="text-xs uppercase tracking-[0.3em]">NO_DE-MANIFESTED_DATA_DETECTED</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  nodes.map((node) => (
                    <motion.tr
                      key={node.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        opacity: [1, 0.8, 1, 0.5, 0],
                        x: [0, -2, 2, -1, 0],
                        filter: ["none", "blur(2px)", "none", "invert(1)", "none"],
                        transition: { duration: 0.4 },
                      }}
                      className="group border-b border-primary/5 transition-colors hover:bg-primary/[0.02]"
                    >
                      <td className="p-4 font-mono text-[11px] uppercase tracking-tight text-primary/60">
                        #{node.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-4 font-mono text-[11px] uppercase text-primary/40">{node.type}</td>
                      <td className="p-4 font-mono text-[11px] uppercase text-primary/40">
                        {format(new Date(node.de_manifested_timestamp), "yyyy.MM.dd HH:mm:ss")}
                      </td>
                      <td className="p-4">
                        <span className="rounded-sm border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/60">
                          {node.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => void restoreNode(node.id, node.original_collection)}
                          className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 border border-primary/30 hover:border-primary hover:bg-primary hover:text-black"
                        >
                          RESTORE
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </main>

      <footer className="z-20 flex h-16 shrink-0 items-center justify-between border-t border-primary/20 bg-black px-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary/40"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">ARCHIVE_LINK_STABLE</span>
          </div>
          <div className="h-4 w-px bg-primary/10" />
          <div className="font-mono text-[10px] text-primary/40">&gt; SCAN_COMPLETE: {nodes.length}_NODES_IDENTIFIED</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sync className="h-3 w-3 animate-spin-slow text-primary/40" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/40">
              {isAuthBypassed ? "LOCAL_TEST_MODE" : "AUTO_SYNC_ACTIVE"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
