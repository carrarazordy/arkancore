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
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalInbox } from "@/components/layout/GlobalInbox";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useProjectStore } from "@/store/useProjectStore";
import { useDialogStore } from "@/store/useDialogStore";
import { SharedProjectCard } from "@/components/ui/SharedProjectCard";
import { TechnicalGridBackground } from "@/components/ui/TechnicalGridBackground";
import { ProjectHeaderBar, TelemetryStatusCard, CollaboratorsCard } from "@/components/ui/ProjectShared";
import { ModuleInitModal } from "@/components/ui/ModuleInitModal";

import { useTaskStore } from "@/store/useTaskStore";

function useOperationsEngine() {
  const { projects } = useProjectStore();
  const { tasks, updateTask, addTask } = useTaskStore();
  const [activeView, setActiveView] = useState<'GRID' | 'PROJECT_EXPANDED'>('GRID');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<'LIST' | 'KANBAN' | 'GRID'>('KANBAN');
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
      tasks,
      systemStatus: 'OPTIMAL',
      activeView,
      selectedProjectId,
      taskViewMode,
      isLoading
    },
    actions: {
      setTaskViewMode,
      updateTask,
      addTask
    },
    metrics,
    initialize,
    expandProject,
    returnToGrid
  };
}

export default function OperationsPage() {
  const { state, actions, metrics, initialize, expandProject, returnToGrid } = useOperationsEngine();
  const { projects, tasks, systemStatus, activeView, selectedProjectId, taskViewMode, isLoading } = state;
  const { setTaskViewMode, updateTask, addTask } = actions;
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<string[]>([
    "[14:02:11] SYNCING_FILES... SUCCESS",
    "[14:05:48] COMPILING_ASSETS_v2.0.4... 100%",
    "[14:10:22] CACHE_CLEARED_ID_7718",
    "[14:15:33] PUSHING_TO_EDGE_NODES... ACTIVE"
  ]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setSessionLogs(prev => [...prev, `[${time}] ${msg}`].slice(-10));
  };

  useEffect(() => {
    initialize();
  }, []);

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
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);
  
  // Calculate real-time progress based on tasks
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const totalTasks = projectTasks.length;
  const progressPercentage = totalTasks === 0 ? (selectedProject?.progress || 0) : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-black text-primary font-mono w-full">
      {/* Background Grid */}
      <TechnicalGridBackground />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden z-10 w-full">
        {/* LEFT: GLOBAL INBOX */}
        <aside className="w-80 border-r border-primary/10 bg-[#0a0a05]/60 backdrop-blur-sm flex flex-col shrink-0">
          <GlobalInbox />
        </aside>

        {/* CENTER: DYNAMIC VIEWPORT */}
        <main className="flex-1 relative overflow-y-auto custom-scrollbar p-8 bg-black/40">
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
            ) : activeView === 'GRID' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <header className="flex items-end justify-between border-b border-primary/20 pb-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                      ACTIVE PROJECTS
                      <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">GRID_VIEW</span>
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">
                      Management of prioritized operational sequences
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-primary/40">
                    <Square className="h-3 w-3 fill-primary" />
                    <span>GRID_LAYOUT_ACTIVE</span>
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProjects.map(project => (
                    <SharedProjectCard
                      key={project.id}
                      project={project}
                      onExpand={expandProject}
                      onDelete={handleDeleteProject}
                      onHoverSound={() => ArkanAudio.play('ui_hover_shimmer')}
                      variant="detailed"
                    />
                  ))}

                  {/* Add New Placeholder */}
                  <button
                    onClick={handleInitProject}
                    onMouseEnter={() => ArkanAudio.play('ui_hover_shimmer')}
                    className="bg-black/30 border border-dashed border-white/10 hover:border-primary/50 p-6 rounded-xl transition-all flex flex-col items-center justify-center text-slate-600 hover:text-primary cursor-pointer h-64 group"
                  >
                    <Plus className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase">INITIALIZE_NODE</span>
                  </button>
                </div>
                <div className="mt-12 grid grid-cols-4 gap-4">
                  <div className="bg-[#1a1a0f] border border-white/5 p-4 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-mono mb-1">DATA_STREAM</p>
                    <div className="h-12 w-full flex items-end gap-1">
                      <div className="bg-primary/40 w-full h-[40%] rounded-sm"></div>
                      <div className="bg-primary/60 w-full h-[60%] rounded-sm"></div>
                      <div className="bg-primary w-full h-[90%] rounded-sm"></div>
                      <div className="bg-primary/40 w-full h-[30%] rounded-sm"></div>
                      <div className="bg-primary/70 w-full h-[70%] rounded-sm"></div>
                    </div>
                  </div>
                  <div className="bg-[#1a1a0f] border border-white/5 p-4 rounded-lg flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 font-mono mb-1">LOCAL_TIME</p>
                    <p className="text-xl font-bold text-white tracking-widest">{new Date().toLocaleTimeString()}</p>
                  </div>
                  <div className="bg-[#1a1a0f] border border-white/5 p-4 rounded-lg flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 font-mono mb-1">UPTIME</p>
                    <p className="text-xl font-bold text-primary tracking-widest">{new Date(metrics.uptime).toISOString().substr(11, 8)}</p>
                  </div>
                  <div className="bg-[#1a1a0f] border border-white/5 p-4 rounded-lg overflow-hidden relative group">
                    <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity"></div>
                    <p className="text-[10px] text-slate-500 font-mono mb-1">QUICK_NOTES</p>
                    <p className="text-[10px] text-slate-300">Click to expand terminal...</p>
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
                          {['critical', 'high', 'medium', 'low'].map(priority => {
                            const pTasks = projectTasks.filter(t => t.priority === priority);
                            if (pTasks.length === 0) return null;
                            return (
                              <div key={priority} className="space-y-1">
                                <label className="text-[10px] uppercase text-primary/40 font-bold">Priority: {priority}</label>
                                {pTasks.map(task => (
                                  <div key={task.id} className="flex items-start gap-3 bg-primary/5 border border-primary/20 p-3 rounded group cursor-pointer hover:bg-primary/10 transition-colors">
                                    <input 
                                      type="checkbox" 
                                      checked={task.status === 'completed'} 
                                      onChange={() => {
                                        updateTask(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' });
                                        addLog(`TASK_${task.id.substring(0,4)}_STATUS_UPDATED`);
                                      }}
                                      className="mt-1 w-4 h-4 rounded border-primary bg-transparent text-primary focus:ring-primary focus:ring-offset-black" 
                                    />
                                    <div className="flex-1">
                                      <p className={cn("text-sm font-medium", task.status === 'completed' ? "text-white/40 line-through" : "text-white/90")}>{task.title}</p>
                                      <p className="text-[10px] text-primary/40 mt-1">Status: {task.status.toUpperCase()} // ID: {task.id.substring(0,6)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          <div className="space-y-1 pt-4">
                            <button className="w-full py-2 border border-dashed border-primary/20 rounded text-[10px] uppercase tracking-[0.2em] text-primary/60 hover:bg-primary/5 hover:text-primary transition-all">
                              + ADD_NEW_OPERATION
                            </button>
                          </div>
                        </div>
                      </section>

                      {/* Center Pane: Operations Hub */}
                      <section className="flex-1 bg-[#1a1a0a]/50 rounded-lg border border-primary/10 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-20"></div>
                        <div className="p-4 border-b border-primary/10 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <h2 className="text-xs font-bold tracking-widest uppercase text-white/70">ACTIVE_TASK_STREAM</h2>
                          </div>
                          <div className="flex items-center gap-2 bg-black/50 p-1 rounded border border-primary/20">
                            <button onClick={() => setTaskViewMode('LIST')} className={cn("px-3 py-1 text-[9px] font-bold tracking-widest transition-colors", taskViewMode === 'LIST' ? "bg-primary text-black" : "text-primary/60 hover:text-primary")}>LIST</button>
                            <button onClick={() => setTaskViewMode('KANBAN')} className={cn("px-3 py-1 text-[9px] font-bold tracking-widest transition-colors", taskViewMode === 'KANBAN' ? "bg-primary text-black" : "text-primary/60 hover:text-primary")}>KANBAN</button>
                            <button onClick={() => setTaskViewMode('GRID')} className={cn("px-3 py-1 text-[9px] font-bold tracking-widest transition-colors", taskViewMode === 'GRID' ? "bg-primary text-black" : "text-primary/60 hover:text-primary")}>GRID</button>
                          </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col">
                          {taskViewMode === 'KANBAN' && <KanbanView tasks={projectTasks} updateTask={updateTask} addLog={addLog} />}
                          {taskViewMode === 'LIST' && <ListView tasks={projectTasks} />}
                          {taskViewMode === 'GRID' && <GridView tasks={projectTasks} />}
                        </div>
                      </section>

                      {/* Right Pane: Analytics */}
                      <section className="w-1/4 flex flex-col gap-6">
                        <TelemetryStatusCard progress={progressPercentage} />

                        {/* Completion Curve Visual */}
                        <div className="flex-1 bg-[#1a1a0a]/50 rounded-lg border border-primary/10 p-5 flex flex-col">
                          <h3 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-4">COMPLETION_CURVE</h3>
                          <div className="flex-1 border-l border-b border-primary/20 relative">
                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                              <path className="opacity-80" d="M0 80 Q 25 70, 50 45 T 100 20" fill="none" stroke="#f9f906" strokeWidth="2"></path>
                              <path className="opacity-20" d="M0 80 Q 25 70, 50 45 T 100 20 L 100 100 L 0 100 Z" fill="url(#grad1)"></path>
                              <defs>
                                <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                                  <stop offset="0%" style={{ stopColor: '#f9f906', stopOpacity: 1 }}></stop>
                                  <stop offset="100%" style={{ stopColor: '#f9f906', stopOpacity: 0 }}></stop>
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute top-4 right-4 text-[10px] text-primary/40">TREND: POSITIVE</div>
                          </div>
                        </div>

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

      </div>

      <ModuleInitModal 
        isOpen={isNewProjectModalOpen} 
        onClose={() => setIsNewProjectModalOpen(false)} 
      />
    </div>
  );
}

function KanbanView({ tasks, updateTask, addLog }: { tasks: any[], updateTask: any, addLog: any }) {
  const todos = tasks.filter(t => t.status === 'todo');
  const inProgress = tasks.filter(t => t.status === 'in-progress');
  const completed = tasks.filter(t => t.status === 'completed');

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTask(taskId, { status });
      addLog(`TASK_${taskId.substring(0,4)}_MOVED_TO_${status.toUpperCase()}`);
      ArkanAudio.playFast('system_execute_clack');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 flex gap-4 p-4 overflow-x-auto custom-scrollbar">
      {/* TO_DO Column */}
      <div 
        className="flex-1 min-w-[280px] flex flex-col gap-4"
        onDrop={(e) => handleDrop(e, 'todo')}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center gap-2 border-l-2 border-primary pl-3">
          <h2 className="text-sm font-bold tracking-widest text-primary/80 uppercase">[ TO_DO ]</h2>
          <span className="bg-primary/10 text-primary text-[10px] px-1.5 rounded">{todos.length}</span>
        </div>
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
          {todos.map(task => (
            <div 
              key={task.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              className="bg-[#11110a] border border-primary/20 p-3 hover:border-primary transition-all group relative cursor-grab active:cursor-grabbing"
              data-context-target={task.id}
              data-context-type="TASK"
              data-context-name={task.title}
            >
              <div className="absolute top-0 right-0 p-1 text-[8px] text-primary/30 font-mono italic">{task.id.substring(0,6)}</div>
              <div className="flex gap-3">
                <div className="w-1 bg-primary self-stretch"></div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] border border-primary/40 text-primary/80 px-1 rounded uppercase">{task.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IN_PROGRESS Column */}
      <div 
        className="flex-1 min-w-[280px] flex flex-col gap-4"
        onDrop={(e) => handleDrop(e, 'in-progress')}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center gap-2 border-l-2 border-primary pl-3">
          <h2 className="text-sm font-bold tracking-widest text-primary/80 uppercase">[ IN_PROGRESS ]</h2>
          <span className="bg-primary text-black text-[10px] px-1.5 font-bold rounded">{inProgress.length}</span>
        </div>
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
          {inProgress.map(task => (
            <div 
              key={task.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              className="bg-primary/5 border-2 border-primary p-3 relative overflow-hidden cursor-grab active:cursor-grabbing"
              data-context-target={task.id}
              data-context-type="TASK"
              data-context-name={task.title}
            >
              <div className="absolute top-0 right-0 p-1 text-[8px] text-primary font-mono italic">{task.id.substring(0,6)}</div>
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
              <div className="flex gap-3 relative z-10">
                <div className="w-1 bg-primary self-stretch animate-pulse"></div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-primary">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] bg-primary text-black px-1 rounded font-bold uppercase tracking-tighter">Active Ops</span>
                    <span className="text-[9px] text-primary uppercase font-bold">{task.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPLETED Column */}
      <div 
        className="flex-1 min-w-[280px] flex flex-col gap-4"
        onDrop={(e) => handleDrop(e, 'completed')}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center gap-2 border-l-2 border-primary/40 pl-3">
          <h2 className="text-sm font-bold tracking-widest text-primary/40 uppercase">[ COMPLETED ]</h2>
          <span className="bg-primary/5 text-primary/40 text-[10px] px-1.5 rounded">{completed.length}</span>
        </div>
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar opacity-60 hover:opacity-100 transition-opacity">
          {completed.map(task => (
            <div 
              key={task.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              className="bg-black border border-primary/10 p-3 grayscale group relative cursor-grab active:cursor-grabbing"
              data-context-target={task.id}
              data-context-type="TASK"
              data-context-name={task.title}
            >
              <div className="absolute top-2 right-2 text-primary/20"><Zap className="w-3 h-3" /></div>
              <div className="flex gap-3">
                <div className="w-1 bg-green-500/50 self-stretch"></div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-white/50 line-through">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-primary/20 uppercase tracking-widest">Operation_Closed</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListView({ tasks }: { tasks: any[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
      {tasks.map(task => (
        <div 
          key={task.id} 
          className="flex items-center gap-4 bg-[#11110a] border border-primary/20 p-4 hover:border-primary transition-colors group"
          data-context-target={task.id}
          data-context-type="TASK"
          data-context-name={task.title}
        >
          <div className={cn("w-2 h-2 rounded-full", task.status === 'completed' ? "bg-green-500" : task.status === 'in-progress' ? "bg-primary animate-pulse" : "bg-primary/40")}></div>
          <div className="flex-1">
            <h4 className={cn("text-sm font-bold tracking-wide", task.status === 'completed' ? "text-white/40 line-through" : "text-white group-hover:text-primary")}>{task.title}</h4>
            {task.description && <p className="text-[10px] text-primary/60 mt-1 line-clamp-1">{task.description}</p>}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] border border-primary/20 px-2 py-1 rounded uppercase text-primary/60">{task.priority}</span>
            <span className="text-[10px] text-primary/40 uppercase w-24 text-right">{task.status}</span>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="text-center text-primary/40 text-xs py-10 tracking-widest uppercase">NO_ACTIVE_TASKS_FOUND</div>
      )}
    </div>
  );
}

function GridView({ tasks }: { tasks: any[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className="bg-[#11110a] border border-primary/20 p-4 rounded hover:border-primary transition-colors flex flex-col gap-4"
            data-context-target={task.id}
            data-context-type="TASK"
            data-context-name={task.title}
          >
            <div className="flex justify-between items-start">
              <span className="text-[8px] text-primary/40 font-mono italic">{task.id.substring(0,8)}</span>
              <div className={cn("w-1.5 h-1.5 rounded-full", task.status === 'completed' ? "bg-green-500" : task.status === 'in-progress' ? "bg-primary animate-pulse" : "bg-primary/40")}></div>
            </div>
            <h4 className={cn("text-xs font-bold tracking-wide", task.status === 'completed' ? "text-white/40 line-through" : "text-white")}>{task.title}</h4>
            <div className="mt-auto flex justify-between items-center border-t border-primary/10 pt-3">
              <span className="text-[9px] text-primary/60 uppercase">{task.priority}</span>
              <span className="text-[9px] text-primary/40 uppercase">{task.status}</span>
            </div>
          </div>
        ))}
      </div>
      {tasks.length === 0 && (
        <div className="text-center text-primary/40 text-xs py-10 tracking-widest uppercase">NO_ACTIVE_TASKS_FOUND</div>
      )}
    </div>
  );
}
