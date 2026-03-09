import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useTaskStore } from "@/store/useTaskStore";
import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function EntropyModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { addTask } = useTaskStore();
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("LOW_01");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            ArkanAudio.playFast('ui_modal_open');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!description.trim()) return;
        addTask({
            title: description.substring(0, 50) + (description.length > 50 ? '...' : ''),
            description,
            status: 'todo',
            priority: priority.includes('CRIT') ? 'critical' : priority.includes('HIGH') ? 'high' : 'medium',
            projectId: 'inbox'
        });
        ArkanAudio.playFast('system_execute_clack');
        setDescription("");
        onClose();
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-mono">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-[2px]"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                            backgroundSize: '100% 2px, 3px 100%'
                        }}
                    />

                    <div className="fixed top-12 left-12 opacity-10 pointer-events-none">
                        <h2 className="text-primary text-6xl font-black tracking-tighter italic font-display">ARKAN_OS</h2>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative z-50 w-full max-w-3xl bg-[#0A0A0A] border border-primary shadow-[0_0_15px_rgba(255,255,0,0.1)] overflow-hidden text-primary"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-50"></div>
                        
                        <div className="flex justify-between items-start p-6 border-b border-primary/20">
                            <div>
                                <h1 className="text-primary text-xl font-bold tracking-widest flex items-center gap-3 font-display">
                                    <Settings2 className="w-5 h-5" />
                                    ENTROPY_COLLECTION_SCAN // INPUT_DATA:
                                </h1>
                                <p className="text-[10px] text-primary/60 mt-1">PROTOCOL_ID: ARKAN_X_99 // SYSTEM_LAYER: MODAL_OVERLAY_V3</p>
                            </div>
                            <button onClick={() => { ArkanAudio.playFast('ui_decline'); onClose(); }} className="text-primary/50 hover:text-primary transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="border border-primary/20 p-3">
                                    <span className="text-[9px] text-primary/40 block">LATENCY_SYNC</span>
                                    <span className="text-primary text-sm">0.042 MS</span>
                                </div>
                                <div className="border border-primary/20 p-3">
                                    <span className="text-[9px] text-primary/40 block">ENCRYPTION_LAYER</span>
                                    <span className="text-primary text-sm uppercase">AES-256-GCM</span>
                                </div>
                                <div className="border border-primary/20 p-3">
                                    <span className="text-[9px] text-primary/40 block">BUFFER_STATE</span>
                                    <span className="text-primary text-sm uppercase">READY_TO_WRITE</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-primary text-xs font-bold tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-primary animate-pulse"></span>
                                        DESCRIPTION_DATA_STREAM:
                                    </label>
                                    <span className="text-[9px] text-primary/40">CHARS: {description.length} / 2048</span>
                                </div>
                                <textarea 
                                    ref={inputRef}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-transparent border border-primary/30 text-primary p-4 font-mono text-sm resize-none outline-none focus:border-primary focus:shadow-[0_0_10px_rgba(255,255,0,0.2)] transition-all placeholder:text-primary/30" 
                                    placeholder="> Waiting for manual entropy input..." 
                                    rows={6}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-primary text-xs font-bold tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-primary"></span>
                                    PRIORITY_LEVEL_TOGGLE:
                                </label>
                                <div className="grid grid-cols-4 gap-0 border border-primary/20 p-1">
                                    {['LOW_01', 'MED_02', 'HIGH_03', 'CRITICAL_MAX'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPriority(p)}
                                            className={cn(
                                                "py-2 text-[10px] transition-all",
                                                priority === p 
                                                    ? "bg-primary text-black font-bold" 
                                                    : "text-primary hover:bg-primary/10 cursor-pointer",
                                                p === 'CRITICAL_MAX' && priority !== p && "font-bold"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-primary/20">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-primary/40">AUTH_STATUS</span>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_#ffff00]"></span>
                                            <span className="text-[10px] text-primary uppercase">Arkan_User</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-primary/40">SESSION_ID</span>
                                        <span className="text-[10px] text-primary/60">1771764481140-9617</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => { ArkanAudio.playFast('ui_decline'); onClose(); }}
                                        className="px-6 py-2 border border-primary/20 text-primary/60 text-[10px] font-bold hover:bg-primary/5 transition-all"
                                    >
                                        ABORT_SEQUENCE
                                    </button>
                                    <button 
                                        onClick={handleSubmit}
                                        className="px-8 py-2 bg-primary text-[#050505] text-[10px] font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,255,0,0.3)] hover:animate-[glitch_0.3s_cubic-bezier(.25,.46,.45,.94)_both_infinite]"
                                    >
                                        INITIALIZE_COLLECTION
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary/5 border-t border-primary/20 p-2 flex justify-between items-center px-6">
                            <span className="text-[8px] text-primary/30 uppercase tracking-[0.3em]">Temporal_Data_Alignment_Active</span>
                            <div className="flex gap-2">
                                <div className="w-1 h-1 bg-primary/40"></div>
                                <div className="w-1 h-1 bg-primary/40"></div>
                                <div className="w-1 h-1 bg-primary/40"></div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
}
