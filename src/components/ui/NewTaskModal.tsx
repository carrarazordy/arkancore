import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useTaskStore } from "@/store/useTaskStore";

export function NewTaskModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [taskTitle, setTaskTitle] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const { addTask } = useTaskStore();

    useEffect(() => {
        if (isOpen) {
            ArkanAudio.playFast('ui_modal_open');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        
        addTask({
            title: taskTitle,
            status: 'todo',
            priority: 'medium',
            projectId: 'inbox'
        });
        
        ArkanAudio.playFast('ui_confirm_ping');
        setTaskTitle("");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full max-w-3xl bg-[#0a0a05] border border-primary p-10 relative shadow-[0_0_40px_rgba(255,255,0,0.15)]"
                    >
                        {/* Corner Accents */}
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary"></div>
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary"></div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                            <div className="space-y-4">
                                <div className="text-[12px] text-[#8b8b00] font-mono tracking-widest flex items-center gap-2 font-bold">
                                    <span className="text-primary">&gt;_</span> SYSTEM SECURITY LAYER
                                </div>
                                <h2 className="text-primary font-mono text-base tracking-widest uppercase font-bold">
                                    INITIALIZE_PROJECT_PROTOCOL // ENTER_ID // ENTER_DATA:
                                </h2>
                            </div>

                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="test"
                                    className="w-full bg-black border border-primary text-primary font-mono text-2xl p-5 outline-none focus:shadow-[0_0_20px_rgba(255,255,0,0.2)] transition-shadow placeholder:text-primary/20"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 w-2 h-8 bg-primary animate-pulse"></div>
                            </div>

                            <div className="flex items-end justify-between mt-4">
                                <div className="space-y-3">
                                    <div className="text-[11px] text-[#8b8b00] font-mono tracking-widest font-bold">
                                        LAT: 12ms
                                    </div>
                                    <div className="text-[11px] text-[#8b8b00] font-mono tracking-widest flex items-center gap-2 font-bold">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#8b8b00] opacity-50"></div>
                                        SECURE_LINK
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            ArkanAudio.playFast('ui_decline');
                                            onClose();
                                        }}
                                        className="px-10 py-5 border border-primary text-primary font-mono text-sm tracking-widest uppercase font-bold hover:bg-primary/10 transition-colors"
                                    >
                                        [ ABORT ]
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-10 py-5 bg-primary text-black font-mono text-sm font-bold tracking-[0.2em] uppercase hover:bg-[#cccc00] transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                                    >
                                        INITIALIZE_MODULE
                                    </button>
                                </div>
                            </div>

                            <div className="absolute bottom-3 right-5 text-[9px] text-[#8b8b00] font-mono tracking-widest font-bold">
                                ARKAN-SOURCE_V4.0
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
