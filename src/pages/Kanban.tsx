import React, { useState, useMemo } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { ArkanAudio } from '@/lib/audio/ArkanAudio';
import { cn } from '@/lib/utils';
import { Zap, Plus, Search } from 'lucide-react';

export default function KanbanPage() {
  const { tasks, updateTask, addTask } = useTaskStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    return tasks.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tasks, searchQuery]);

  const todos = filteredTasks.filter(t => t.status === 'todo');
  const inProgress = filteredTasks.filter(t => t.status === 'in-progress');
  const completed = filteredTasks.filter(t => t.status === 'completed');

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTask(taskId, { status });
      ArkanAudio.playFast('system_execute_clack');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-white font-display overflow-hidden relative">
      <div className="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>
      
      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-64 border-r border-primary/20 bg-black flex flex-col p-4 gap-6 shrink-0 z-10">
          <button 
            onClick={() => {
              addTask({
                title: 'NEW_TASK_INITIALIZED',
                projectId: 'global',
                status: 'todo',
                priority: 'medium',
                progress: 0
              });
              ArkanAudio.playFast('system_engage');
            }}
            className="w-full py-3 bg-primary text-black font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-[0_0_15px_rgba(255,255,0,0.3)]"
          >
            <Plus size={14} strokeWidth={3} />
            NEW_TASK
          </button>
          
          <div className="relative flex items-center bg-[#0a0a05] border border-primary/10 px-3 py-1">
            <Search className="text-primary/40 h-3 w-3 mr-2" />
            <input 
              className="bg-transparent border-none text-[10px] w-full focus:ring-0 text-primary placeholder:text-primary/20 uppercase tracking-widest outline-none" 
              placeholder="QUERY_TASKS..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <nav className="space-y-4">
            <div>
              <div className="text-[10px] text-primary/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-primary/40"></span>
                CORE_DIRECTORIES
              </div>
              <ul className="space-y-1">
                <li className="flex items-center justify-between group cursor-pointer py-1.5 px-2 hover:bg-primary/5 border-l border-transparent hover:border-primary">
                  <span className="text-xs text-primary/80 group-hover:text-primary tracking-wide">/ALL_RESOURCES</span>
                  <span className="text-[9px] text-primary/30">042</span>
                </li>
                <li className="flex items-center justify-between group cursor-pointer py-1.5 px-2 bg-primary/10 border-l border-primary">
                  <span className="text-xs text-primary tracking-wide">/ACTIVE_LOGS</span>
                  <span className="text-[9px] text-primary/60">012</span>
                </li>
                <li className="flex items-center justify-between group cursor-pointer py-1.5 px-2 hover:bg-primary/5 border-l border-transparent hover:border-primary">
                  <span className="text-xs text-primary/80 group-hover:text-primary tracking-wide">/SECURE_VAULT</span>
                  <span className="text-[9px] text-primary/30">008</span>
                </li>
                <li className="flex items-center justify-between group cursor-pointer py-1.5 px-2 hover:bg-primary/5 border-l border-transparent hover:border-primary">
                  <span className="text-xs text-primary/80 group-hover:text-primary tracking-wide">/ARCHIVE_EXT</span>
                  <span className="text-[9px] text-primary/30">154</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-[10px] text-primary/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-primary/40"></span>
                TAGS_METADATA
              </div>
              <div className="flex flex-wrap gap-2 px-2">
                <span className="text-[9px] px-2 py-0.5 border border-primary/20 text-primary/60 hover:border-primary/60 cursor-pointer uppercase tracking-tighter">#security</span>
                <span className="text-[9px] px-2 py-0.5 border border-primary/20 text-primary/60 hover:border-primary/60 cursor-pointer uppercase tracking-tighter">#infra</span>
                <span className="text-[9px] px-2 py-0.5 border border-primary/20 text-primary/60 hover:border-primary/60 cursor-pointer uppercase tracking-tighter">#uplink</span>
                <span className="text-[9px] px-2 py-0.5 border border-primary/20 text-primary/60 hover:border-primary/60 cursor-pointer uppercase tracking-tighter">#neural</span>
              </div>
            </div>
          </nav>
          <div className="mt-auto pt-6 border-t border-primary/10">
            <div className="flex justify-between items-end mb-2">
              <div className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">SYS_STORAGE</div>
              <div className="text-[10px] text-primary/40 font-mono">72.4%</div>
            </div>
            <div className="h-1.5 w-full bg-primary/5 rounded-full overflow-hidden border border-primary/10">
              <div className="h-full bg-primary w-[72.4%] shadow-[0_0_8px_rgba(255,255,0,0.5)]"></div>
            </div>
            <div className="mt-3 flex justify-between items-center text-[8px] text-primary/30 font-mono">
              <span>SECTOR_01 // OK</span>
              <span>992.4 GB</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col p-6 overflow-hidden kanban-grid" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 0, 0.02) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* TO_DO */}
            <div 
              className="flex flex-col h-full"
              onDrop={(e) => handleDrop(e, 'todo')}
              onDragOver={handleDragOver}
            >
              <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
                <h2 className="text-sm font-black text-primary tracking-[0.3em] uppercase flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary/20 rotate-45"></span>
                  TO_DO
                </h2>
                <span className="text-[10px] text-primary/40 font-mono bg-primary/5 px-2 py-0.5 border border-primary/10">CNT_{todos.length.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {todos.map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-[#0a0a05] border border-primary/40 p-4 hover:border-primary transition-all group relative cursor-grab active:cursor-grabbing"
                    data-context-target={task.id}
                    data-context-type="TASK"
                    data-context-name={task.title}
                  >
                    <div className="absolute top-0 right-0 p-1 text-[8px] text-primary/30 font-mono italic">#{task.id.substring(0,6).toUpperCase()}</div>
                    <h3 className="font-bold text-sm text-primary group-hover:neon-text transition-all tracking-wide mb-3 uppercase">{task.title}</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[9px] border border-primary/40 text-primary/80 px-2 py-0.5 rounded-sm uppercase bg-primary/5">{task.priority}</span>
                      <span className="text-[8px] text-primary/40 uppercase font-mono tracking-tighter">LOC: SECTOR_07</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-primary/80 font-bold bg-primary/10 px-2 py-1 uppercase border border-primary/20 tracking-widest">{task.priority}_PRIORITY</span>
                      <div className="flex gap-2">
                        <span className="material-icons text-primary/20 text-xs hover:text-primary cursor-pointer">edit</span>
                        <span className="material-icons text-primary/20 text-xs hover:text-primary cursor-pointer">more_vert</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IN_PROGRESS */}
            <div 
              className="flex flex-col h-full"
              onDrop={(e) => handleDrop(e, 'in-progress')}
              onDragOver={handleDragOver}
            >
              <div className="flex items-center justify-between mb-4 border-b border-primary/60 pb-2">
                <h2 className="text-sm font-black text-primary tracking-[0.3em] uppercase flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary rotate-45 animate-pulse shadow-[0_0_5px_yellow]"></span>
                  IN_PROGRESS
                </h2>
                <span className="text-[10px] text-primary font-mono bg-primary/10 px-2 py-0.5 border border-primary/40">CNT_{inProgress.length.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {inProgress.map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-[#0a0a05] border border-primary p-4 shadow-[0_0_5px_rgba(255,255,0,0.15)] group relative cursor-grab active:cursor-grabbing"
                    data-context-target={task.id}
                    data-context-type="TASK"
                    data-context-name={task.title}
                  >
                    <div className="absolute top-0 right-0 p-1 text-[8px] text-primary font-mono italic">#{task.id.substring(0,6).toUpperCase()}</div>
                    <h3 className="font-bold text-sm text-primary tracking-wide mb-3 uppercase">{task.title}</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[9px] border border-primary text-primary px-2 py-0.5 rounded-sm uppercase bg-primary/10">{task.priority}</span>
                      <span className="text-[8px] text-primary/60 uppercase font-mono tracking-tighter">LOC: LAB_09</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-primary font-black bg-primary/20 px-2 py-1 uppercase border border-primary/50 tracking-widest">{task.priority}_PRIORITY</span>
                      <div className="flex gap-2">
                        <span className="material-icons text-primary/60 text-xs">sync</span>
                      </div>
                    </div>
                    <div className="mt-4 h-0.5 w-full bg-primary/10">
                      <div className="h-full bg-primary w-[45%]"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPLETED */}
            <div 
              className="flex flex-col h-full"
              onDrop={(e) => handleDrop(e, 'completed')}
              onDragOver={handleDragOver}
            >
              <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
                <h2 className="text-sm font-black text-primary/40 tracking-[0.3em] uppercase flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary/10 rotate-45"></span>
                  COMPLETED
                </h2>
                <span className="text-[10px] text-primary/20 font-mono bg-primary/5 px-2 py-0.5 border border-primary/10">CNT_{completed.length.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 opacity-60 grayscale hover:grayscale-0 transition-all">
                {completed.map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-[#0a0a05] border border-primary/10 p-4 group relative cursor-grab active:cursor-grabbing"
                    data-context-target={task.id}
                    data-context-type="TASK"
                    data-context-name={task.title}
                  >
                    <div className="absolute top-0 right-0 p-1 text-[8px] text-primary/20 font-mono italic">#{task.id.substring(0,6).toUpperCase()}</div>
                    <h3 className="font-bold text-sm text-primary/40 line-through tracking-wide mb-3 uppercase">{task.title}</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[9px] border border-primary/10 text-primary/20 px-2 py-0.5 rounded-sm uppercase">{task.priority}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-primary/20 font-bold bg-primary/5 px-2 py-1 uppercase border border-primary/5 tracking-widest">P02_MID</span>
                      <span className="material-icons text-primary/40 text-sm">verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <div className="fixed top-20 left-4 text-[10px] text-primary/10 font-mono pointer-events-none uppercase">Grid_Ref: X-104.992</div>
      <div className="fixed top-4 left-72 text-[10px] text-primary/10 font-mono pointer-events-none uppercase">Grid_Ref: Y--02.441</div>
      <div className="fixed bottom-14 left-4 text-[10px] text-primary/10 font-mono pointer-events-none uppercase">Grid_Ref: Z-11.002</div>
    </div>
  );
}
