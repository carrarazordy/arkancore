import React, { useEffect, useState, useMemo } from "react";
import {
  Square,
  LayoutGrid,
  Activity,
  Cpu,
  Signal,
  Database,
  Search,
  Plus,
  ArrowLeft,
  Zap,
  Clock,
  Trash2,
  Terminal as TerminalIcon,
  LogOut,
  Network
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalInbox } from "@/components/layout/GlobalInbox";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useProjectStore } from "@/store/useProjectStore";
import { useDialogStore } from "@/store/useDialogStore";
import { ModuleInitModal } from "@/components/ui/ModuleInitModal";
import { useIdentityStore } from "@/store/useIdentityStore";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "@/store/useTaskStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useUIStore } from "@/store/useUIStore";
import { SharedProjectCard } from "@/components/ui/SharedProjectCard";
import { TechnicalGridBackground } from "@/components/ui/TechnicalGridBackground";
import { ProjectHeaderBar, TelemetryStatusCard, CollaboratorsCard } from "@/components/ui/ProjectShared";

// Inline useDashboardEngine
function useDashboardEngine() {
  const { projects } = useProjectStore();
  const [activeView, setActiveView] = useState<'GRID' | 'PROJECT_EXPANDED'>('GRID');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    heartbeatMs: 53,
    uptime: new Date().getTime(),
    sessionStartTime: new Date().getTime()
  });

  const initialize = () => {
    setTimeout(() => setIsLoading(false), 800);
  };

  const expandProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView('PROJECT_EXPANDED');
  };

  const returnToGrid = () => {
    setSelectedProjectId(null);
    setActiveView('GRID');
  };

  return {
    state: {
      projects,
      systemStatus: 'OPTIMAL',
      activeView,
      selectedProjectId,
      isLoading
    },
    metrics,
    initialize,
    expandProject,
    returnToGrid
  };
}

export default function DashboardPage() {
  const { state, metrics, initialize, expandProject, returnToGrid } = useDashboardEngine();
  const { projects, systemStatus, activeView, selectedProjectId, isLoading } = state;
  const [searchQuery, setSearchQuery] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [activeTab, setActiveTab] = useState<'INBOX' | 'OPERATIONS'>('OPERATIONS');

  const { setIsNewProjectModalOpen } = useUIStore();

  const { terminateSession } = useIdentityStore();
  const navigate = useNavigate();
  const { tasks } = useTaskStore();
  const { query: globalSearchQuery, setQuery: setGlobalSearchQuery, toggleSearch } = useSearchStore();

  const inboxCount = tasks.filter(t => t.projectId === 'inbox' && t.status !== 'completed').length;
  const operationsCount = projects.length;

  const handleLogout = async () => {
    if (confirm("CONFIRM_SYSTEM_EXIT?")) {
      await terminateSession('current');
      navigate('/login');
    }
  };

  useEffect(() => {
    initialize();
    const savedNote = localStorage.getItem('arkan_quick_note');
    if (savedNote) setQuickNote(savedNote);
  }, []);

  const handleQuickNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuickNote(e.target.value);
    localStorage.setItem('arkan_quick_note', e.target.value);
  };

  const handleInitProject = () => {
    ArkanAudio.playFast('system_engage');
    setIsNewProjectModalOpen(true);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    ArkanAudio.playFast('system_engage');
    useDialogStore.getState().openDialog({
      title: `PURGE PROTOCOL // ${name}`,
      confirmLabel: "PURGE_DATA",
      hideInput: true,
      onConfirm: async () => {
        await useProjectStore.getState().deleteProject(id);
        ArkanAudio.playFast('system_purge');
      }
    });
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.technicalId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-black text-primary font-mono w-full">
      {/* Background Grid */}
      <TechnicalGridBackground />

      {/* Dashboard Views */}
      <div className="mt-6 mb-2 flex items-center px-8 gap-8 shrink-0 z-20">
        <button
          onClick={() => {
            setActiveTab('OPERATIONS');
            ArkanAudio.playFast('key_tick_mechanical');
          }}
          className={cn(
            "flex items-center gap-3 pb-2 border-b-2 transition-all group",
            activeTab === 'OPERATIONS' ? "border-primary text-primary" : "border-transparent text-primary/40 hover:text-primary/60 hover:border-primary/20"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">OPERATIONS</span>
          <span className="bg-primary/10 text-primary text-[8px] px-1.5 py-0.5 rounded-sm font-mono">
            {operationsCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('INBOX');
            ArkanAudio.playFast('key_tick_mechanical');
          }}
          className={cn(
            "flex items-center gap-3 pb-2 border-b-2 transition-all group",
            activeTab === 'INBOX' ? "border-primary text-primary" : "border-transparent text-primary/40 hover:text-primary/60 hover:border-primary/20"
          )}
        >
          <Plus className="h-3.5 w-3.5 rotate-45" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">INBOX</span>
          <span className="bg-primary/10 text-primary text-[8px] px-1.5 py-0.5 rounded-sm font-mono">
            {inboxCount}
          </span>
        </button>

        {activeTab === 'OPERATIONS' && activeView === 'GRID' && (
          <div className="ml-auto relative group w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary/30 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH_OPERATIONS..."
              className="w-full bg-black/40 border border-primary/20 rounded-sm py-1 pl-8 pr-4 text-[9px] text-primary placeholder:text-primary/20 focus:border-primary/40 focus:bg-primary/5 transition-all outline-none uppercase tracking-widest"
            />
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden z-10 w-full">
        {/* DYNAMIC VIEWPORT */}
        <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-black/20">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-4 opacity-50"
              >
                <Cpu className="h-12 w-12 animate-spin text-primary" />
                <span className="text-xs tracking-[0.3em] animate-pulse">ESTABLISHING_UPLINK...</span>
              </motion.div>
            ) : activeTab === 'INBOX' ? (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <GlobalInbox />
              </motion.div>
            ) : activeView === 'GRID' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="p-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[12px]">
                    {filteredProjects.map(project => (
                      <SharedProjectCard
                        key={project.id}
                        project={project}
                        onExpand={expandProject}
                        onDelete={handleDeleteProject}
                        onHoverSound={() => ArkanAudio.play('ui_hover_shimmer')}
                        variant="compact"
                      />
                    ))}

                    {/* Add New Placeholder */}
                    <button
                      onClick={handleInitProject}
                      onMouseEnter={() => ArkanAudio.play('ui_hover_shimmer')}
                      className="border border-dashed border-primary/20 rounded-sm h-44 flex flex-col items-center justify-center gap-3 text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-150 group"
                    >
                      <div className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] tracking-[0.2em] font-bold uppercase">Initialize_New_Module</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col relative"
              >
                {selectedProject ? (
                  <>
                    {/* Top Bar */}
                    <ProjectHeaderBar 
                      projectName={selectedProject.name} 
                      uptime={metrics.uptime} 
                      onBack={returnToGrid} 
                    />

                    {/* Main Workspace */}
                    <div className="flex-1 flex gap-6 relative overflow-hidden">
                      {/* Left Pane: Operations */}
                      <section className="w-1/4 bg-[#1a1a0a]/50 rounded-lg border border-primary/10 flex flex-col relative overflow-hidden">
                        <div className="p-4 border-b border-primary/10 flex justify-between items-center bg-primary/5">
                          <h2 className="text-xs font-bold tracking-widest uppercase text-primary">Operations_Log</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase text-primary/40 font-bold">Priority: CRITICAL</label>
                            <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 p-3 rounded group cursor-pointer hover:bg-primary/10 transition-colors">
                              <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 rounded border-primary bg-transparent text-primary focus:ring-primary focus:ring-offset-black" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white/90">Initialize Neural Sync Protocols</p>
                                <p className="text-[10px] text-primary/40 mt-1">Status: DEPLOYED // ID: 882-QX</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase text-primary/40 font-bold">Priority: PENDING</label>
                            <div className="flex items-start gap-3 bg-white/5 border border-white/5 p-3 rounded group cursor-pointer hover:border-primary/20 transition-colors">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded border-primary/40 bg-transparent text-primary focus:ring-primary focus:ring-offset-black" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white/70">Refactor Core Logic v2.4</p>
                                <p className="text-[10px] text-primary/40 mt-1">Assignee: ARKAN_CORE</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 pt-4">
                            <button className="w-full py-2 border border-dashed border-primary/20 rounded text-[10px] uppercase tracking-[0.2em] text-primary/60 hover:bg-primary/5 hover:text-primary transition-all">
                              + ADD_NEW_OPERATION
                            </button>
                          </div>
                        </div>
                      </section>

                      {/* Center Pane: Documentation */}
                      <section className="flex-1 bg-[#1a1a0a]/50 rounded-lg border border-primary/10 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-20"></div>
                        <div className="p-4 border-b border-primary/10 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <h2 className="text-xs font-bold tracking-widest uppercase text-white/70">ARCHIVE_DOC // CORE_SPECS.md</h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-primary/40">MODE: LIVE_MARKDOWN</span>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar font-mono text-sm leading-relaxed">
                          <div className="max-w-2xl mx-auto space-y-6">
                            <div className="border-l-2 border-primary pl-4 py-1">
                              <h1 className="text-2xl font-black text-white tracking-tight uppercase">{selectedProject.name}</h1>
                            </div>
                            <p className="text-primary/60">The implementation of the <code className="text-primary bg-primary/10 px-1">{selectedProject.technicalId}</code> architecture focuses on decentralized data processing and sub-second decision making within the Arkan environment.</p>
                            
                            <div className="bg-black/40 border border-primary/10 p-4 rounded-lg">
                              <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest">Key Objectives:</h3>
                              <ul className="space-y-2 text-xs text-primary/60">
                                <li className="flex items-center gap-2"><span className="text-primary">01.</span> Latency reduction in neural sync protocols.</li>
                                <li className="flex items-center gap-2"><span className="text-primary">02.</span> Encryption hardening via quantum-resistant algorithms.</li>
                                <li className="flex items-center gap-2"><span className="text-primary">03.</span> API integration for external telemetry node clusters.</li>
                              </ul>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent my-8"></div>
                            
                            <h2 className="text-lg font-bold text-white/90 uppercase">Operational Roadmap</h2>
                            <p className="text-primary/60">Current progress suggests a stable deployment within the next 48 hours. Monitoring nodes are active in the EMEA and APAC regions.</p>
                            
                            <div className="h-40 w-full rounded-lg bg-primary/5 border border-primary/10 relative overflow-hidden mt-6 flex items-center justify-center">
                              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(249, 249, 6, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 249, 6, 0.2) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                              <span className="text-primary/40 font-bold tracking-widest uppercase">SCHEMATIC: NODE_CLUSTER_ALPHA_7</span>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Right Pane: Analytics */}
                      <section className="w-1/4 flex flex-col gap-6">
                        <TelemetryStatusCard progress={selectedProject.progress || 0} />
                        <CollaboratorsCard />
                      </section>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-red-500 font-bold tracking-widest">MODULE_LOAD_ERROR</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT: METRICS & QUICK NOTES */}
        <aside className="w-72 border-l border-primary/10 bg-[#0a0a05]/80 backdrop-blur-sm p-4 flex flex-col gap-4 shrink-0 pointer-events-auto">
          <div className="p-4 border border-primary/20 rounded bg-black/40">
            <h3 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Activity className="h-3 w-3" />
              System_Uptime
            </h3>
            <div className="text-2xl font-mono text-primary tabular-nums">
              {new Date(metrics.uptime).toISOString().substr(11, 8)}
            </div>
          </div>

          <div className="flex-1 flex flex-col border border-primary/20 rounded bg-black/40 overflow-hidden">
            <div className="p-3 border-b border-primary/10 bg-primary/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Quick_Buffer</span>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            </div>
            <textarea
              className="flex-1 bg-transparent p-3 text-[10px] font-mono text-primary/80 resize-none outline-none placeholder:text-primary/20 leading-relaxed"
              placeholder="> ENTER_TEMPORAL_DATA..."
              value={quickNote}
              onChange={handleQuickNoteChange}
              spellCheck={false}
            />
          </div>

          <div className="p-4 border border-primary/20 rounded bg-black/40 flex flex-col gap-2">
            <h3 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Session_ID
            </h3>
            <div className="text-[9px] font-mono text-primary/40 break-all leading-tight">
              {metrics.sessionStartTime}-{Math.floor(Math.random() * 9999)}
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER: 4 WIDGETS EVENLY DISTRIBUTED */}
      <footer className="h-16 border-t border-primary/20 bg-[#0a0a05] grid grid-cols-4 gap-[12px] p-[12px] z-20 shrink-0">
        {/* DATA_STREAM */}
        <div className="border border-primary/10 bg-primary/[0.02] flex items-center px-4 gap-3 overflow-hidden group hover:border-primary/30 transition-all duration-150">
          <TerminalIcon className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
          <div className="flex-1 min-w-0">
            <div className="text-[8px] text-primary/30 uppercase font-bold tracking-widest mb-0.5">DATA_STREAM</div>
            <div className="text-[9px] text-primary/60 font-mono truncate">
              &gt; SYSTEM_HEARTBEAT_ACKNOWLEDGED
            </div>
          </div>
        </div>

        {/* LOCAL_TIME */}
        <div className="border border-primary/10 bg-primary/[0.02] flex items-center px-4 gap-3 group hover:border-primary/30 transition-all duration-150">
          <Clock className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
          <div className="flex-1">
            <div className="text-[8px] text-primary/30 uppercase font-bold tracking-widest mb-0.5">LOCAL_TIME</div>
            <div className="text-[10px] text-primary/80 font-mono tabular-nums">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {/* UPTIME */}
        <div className="border border-primary/10 bg-primary/[0.02] flex items-center px-4 gap-3 group hover:border-primary/30 transition-all duration-150">
          <Activity className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
          <div className="flex-1">
            <div className="text-[8px] text-primary/30 uppercase font-bold tracking-widest mb-0.5">SYSTEM_UPTIME</div>
            <div className="text-[10px] text-primary/80 font-mono tabular-nums">
              {new Date(metrics.uptime).toISOString().substr(11, 8)}
            </div>
          </div>
        </div>

        {/* QUICK_NOTES / BUFFER */}
        <div className="border border-primary/10 bg-primary/[0.02] flex items-center px-4 gap-3 group hover:border-primary/30 transition-all duration-150 relative">
          <Zap className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
          <div className="flex-1 h-full py-1">
            <div className="text-[8px] text-primary/30 uppercase font-bold tracking-widest mb-0.5">QUICK_BUFFER</div>
            <input
              type="text"
              value={quickNote}
              onChange={(e) => {
                setQuickNote(e.target.value);
                localStorage.setItem('arkan_quick_note', e.target.value);
              }}
              placeholder="ENTER_TEMPORAL_DATA..."
              className="w-full bg-transparent border-none p-0 text-[10px] text-primary/80 outline-none placeholder:text-primary/10 font-mono"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
