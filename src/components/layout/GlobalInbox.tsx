import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Inbox, ChevronRight, Plus, Terminal } from "lucide-react";
import { useDialogStore } from "@/store/useDialogStore";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { Link } from "react-router-dom";
import { EntropyModal } from "@/components/ui/EntropyModal";
import { useState } from "react";

export function GlobalInbox() {
    const { projects } = useProjectStore();
    const { tasks } = useTaskStore();
    const [isEntropyModalOpen, setIsEntropyModalOpen] = useState(false);

    // Global Inbox Items: Tasks with no project ID or linked to a "Null" project
    const inboxTasks = tasks.filter(t => !t.projectId || t.projectId === 'null' || t.projectId === 'inbox');

    const handleCollectEntropy = () => {
        ArkanAudio.play('system_execute_clack');
        setIsEntropyModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-black/40 w-full">
            <div className="h-12 px-4 border-b border-primary/10 bg-primary/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">GLOBAL_INBOX</span>
                </div>
                <div className="text-[9px] font-mono text-primary/40 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                    {inboxTasks.length}_ITEMS
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {inboxTasks.length > 0 ? (
                    inboxTasks.map((task) => (
                        <div 
                            key={task.id} 
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData("taskId", task.id);
                                ArkanAudio.playFast('key_tick_mechanical');
                            }}
                            className="bg-primary/5 border border-primary/10 p-3 rounded group hover:border-primary hover:bg-primary/10 transition-all duration-150 cursor-pointer relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-[8px] font-mono text-primary/40 uppercase tracking-tighter">ID: {task.id.slice(-8)}</span>
                                <button className="p-1 hover:bg-primary/20 rounded text-primary/40 hover:text-primary transition-colors">
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            <p className="text-xs text-white/70 group-hover:text-primary transition-colors mb-3 leading-tight uppercase font-medium tracking-wide">
                                {task.title}
                            </p>

                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-primary/5">
                                <span className="text-[8px] font-mono text-primary/30 uppercase">ROUTE_TO:</span>
                                <div className="flex-1 flex gap-1 overflow-hidden">
                                    {projects.slice(0, 2).map(p => (
                                        <button
                                            key={p.id}
                                            className="px-1.5 py-0.5 bg-primary/5 border border-primary/20 rounded text-[8px] text-primary/40 hover:text-black hover:bg-primary transition-all truncate uppercase"
                                        >
                                            {p.technicalId}
                                        </button>
                                    ))}
                                </div>
                                <ChevronRight className="h-3 w-3 text-primary/20 group-hover:text-primary transition-all" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ffff00 0, #ffff00 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
                        <Terminal className="h-8 w-8 mb-2 text-primary" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">AWAITING_INPUT</span>
                    </div>
                )}
            </div>

            {/* Integrated Sidebar Actions */}
            <div className="p-3 border-t border-primary/10 bg-black/40 flex flex-col gap-2 shrink-0">
                <button
                    onClick={handleCollectEntropy}
                    className="w-full py-2.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-black transition-all duration-150 flex items-center justify-center gap-2 shadow-sm hover:shadow-[0_0_15px_rgba(255,255,0,0.2)]"
                >
                    <Plus className="h-3 w-3" />
                    COLLECT_ENTROPY
                </button>
                <Link
                    to="/dashboard/global-archive"
                    onClick={() => ArkanAudio.playFast('clack')}
                    className="w-full py-2.5 bg-transparent border border-primary/10 text-primary/40 text-[9px] font-bold uppercase tracking-[0.2em] hover:border-primary/40 hover:text-primary transition-all duration-150 text-center flex items-center justify-center gap-2"
                >
                    <Terminal className="h-3 w-3" />
                    VIEW_ALL_ARCHIVES
                </Link>
            </div>
            
            <EntropyModal 
                isOpen={isEntropyModalOpen} 
                onClose={() => setIsEntropyModalOpen(false)} 
            />
        </div>
    );
}
