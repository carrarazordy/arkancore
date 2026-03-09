import React, { useState, useEffect, useCallback } from "react";
import { 
  Database, 
  RefreshCw as Sync, 
  Terminal, 
  RotateCcw as Restore,
  Search,
  Cpu,
  Zap,
  Network,
  Activity,
  User as Person,
  Archive as ArchiveIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { TechnicalGridBackground } from "@/components/ui/TechnicalGridBackground";

interface ArchivedNode {
  id: string;
  title: string;
  type: "TASK" | "PROJECT" | "LOGISTIC";
  de_manifested_timestamp: string;
  status: string;
  original_collection: string;
}

export default function ArchivePage() {
  const [nodes, setNodes] = useState<ArchivedNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const addLog = useSystemLogStore((state) => state.addLog);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    addLog(">> SCANNING_HISTORICAL_CHANNELS...", "system");
    
    try {
      // In a real app, we'd fetch from multiple tables. 
      // For this implementation, we'll simulate the unified fetch.
      // We'll try to fetch from 'tasks' and 'projects' where is_archived = true
      
      const [tasksRes, projectsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('is_archived', true),
        supabase.from('projects').select('*').eq('is_archived', true)
      ]);

      const unifiedNodes: ArchivedNode[] = [
        ...(tasksRes.data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          type: "TASK" as const,
          de_manifested_timestamp: t.updatedAt || new Date().toISOString(),
          status: "INDEXED",
          original_collection: "tasks"
        })),
        ...(projectsRes.data || []).map((p: any) => ({
          id: p.id,
          title: p.name,
          type: "PROJECT" as const,
          de_manifested_timestamp: p.updatedAt || new Date().toISOString(),
          status: "INDEXED",
          original_collection: "projects"
        }))
      ];

      // Sort by timestamp descending
      unifiedNodes.sort((a, b) => 
        new Date(b.de_manifested_timestamp).getTime() - new Date(a.de_manifested_timestamp).getTime()
      );

      setNodes(unifiedNodes);
      addLog(`>> SCAN_COMPLETE: ${unifiedNodes.length}_NODES_IDENTIFIED`, "system");
    } catch (error) {
      addLog(">> SCAN_INTERRUPTED: CHANNEL_ERROR", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const restoreNode = async (id: string, collection: string) => {
    addLog(`>> INITIATING_RE-MANIFESTATION: NODE_${id.slice(0, 8)}`, "system");
    ArkanAudio.play('restore_ascending_ping');

    const { error } = await supabase
      .from(collection)
      .update({ is_archived: false, status: 'todo' })
      .eq('id', id);

    if (!error) {
      addLog(`SUCCESS: NODE_${id.slice(0, 8)} RESTORED_TO_ACTIVE_DASHBOARD`, "system");
      // Trigger glitch animation for the specific node before removing it from state
      setNodes(prev => prev.filter(n => n.id !== id));
    } else {
      addLog(`RESTORE_FAILED: ${error.message}`, "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-primary/40 font-mono selection:bg-primary selection:text-black overflow-hidden relative">
      {/* Background Grid */}
      <TechnicalGridBackground />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 relative z-10 overflow-hidden">
        <div className="mb-8">
          <h1 className="text-sm font-bold tracking-[0.2em] text-white uppercase italic mb-2">
            Historical_Archive // Indexed
          </h1>
          <div className="h-px w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent"></div>
        </div>

        {/* Technical Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-primary/20 bg-black/40 rounded-sm">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-black z-30">
              <tr className="border-b border-primary/20">
                <th className="p-4 text-[10px] font-bold tracking-widest text-primary/60 uppercase">[ID_TAG]</th>
                <th className="p-4 text-[10px] font-bold tracking-widest text-primary/60 uppercase">[TYPE]</th>
                <th className="p-4 text-[10px] font-bold tracking-widest text-primary/60 uppercase">[DE-MANIFESTED_TIMESTAMP]</th>
                <th className="p-4 text-[10px] font-bold tracking-widest text-primary/60 uppercase">[STATUS]</th>
                <th className="p-4 text-[10px] font-bold tracking-widest text-primary/60 uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {nodes.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <ArchiveIcon className="h-12 w-12" />
                        <span className="text-xs tracking-[0.3em] uppercase">NO_DE-MANIFESTED_DATA_DETECTED</span>
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
                        transition: { duration: 0.4 }
                      }}
                      className="border-b border-primary/5 hover:bg-primary/[0.02] transition-colors group"
                    >
                      <td className="p-4 text-[11px] font-mono text-primary/60 uppercase tracking-tight">
                        #{node.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-4 text-[11px] font-mono text-primary/40 uppercase">
                        {node.type}
                      </td>
                      <td className="p-4 text-[11px] font-mono text-primary/40 uppercase">
                        {format(new Date(node.de_manifested_timestamp), "yyyy.MM.dd HH:mm:ss")}
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 border border-primary/20 rounded-sm bg-primary/5 text-primary/60 uppercase tracking-widest">
                          {node.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => restoreNode(node.id, node.original_collection)}
                          className="px-3 py-1 border border-primary/30 hover:border-primary hover:bg-primary hover:text-black text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95"
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

      {/* Technical Footer */}
      <footer className="h-16 border-t border-primary/20 bg-black flex items-center justify-between px-8 z-20 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"></div>
            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">ARCHIVE_LINK_STABLE</span>
          </div>
          <div className="h-4 w-px bg-primary/10" />
          <div className="text-[10px] text-primary/40 font-mono">
            &gt; SCAN_COMPLETE: {nodes.length}_NODES_IDENTIFIED
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sync className="h-3 w-3 text-primary/40 animate-spin-slow" />
            <span className="text-[9px] text-primary/40 uppercase font-bold tracking-widest">AUTO_SYNC_ACTIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
