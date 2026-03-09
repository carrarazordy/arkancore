import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useProjectStore } from "@/store/useProjectStore";
import { Settings2, RefreshCw, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModuleInitModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { addProject } = useProjectStore();
    const [identifier, setIdentifier] = useState("");
    const [sector, setSector] = useState("SECTOR_ALPHA_01 [VIRTUAL]");
    const [priority, setPriority] = useState("ROUTINE");

    const generateId = () => {
        setIdentifier(`ARKAN-MOD-${Math.floor(Math.random() * 9000) + 1000}-X`);
    };

    useEffect(() => {
        if (isOpen) {
            ArkanAudio.playFast('ui_modal_open');
            generateId();
        }
    }, [isOpen]);

    const handleSubmit = () => {
        addProject({
            name: identifier,
            progress: 0,
        });
        ArkanAudio.playFast('system_execute_clack');
        onClose();
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-mono text-primary">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-[2px]"
                    />
                    
                    {/* Background Grid Effect */}
                    <div className="fixed inset-0 opacity-20 pointer-events-none scale-105 blur-sm overflow-hidden flex items-center justify-center">
                        <div className="w-full max-w-5xl h-3/4 p-8 border-[1px] border-primary/30 flex flex-col gap-4">
                            <div className="h-12 border border-primary/30 w-full"></div>
                            <div className="flex-1 flex gap-4">
                                <div className="w-64 border border-primary/30 h-full"></div>
                                <div className="flex-1 border border-primary/30 h-full relative overflow-hidden">
                                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(217, 249, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(217, 249, 0, 0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                </div>
                                <div className="w-80 border border-primary/30 h-full"></div>
                            </div>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative z-50 w-full max-w-3xl border border-primary shadow-[0_0_15px_rgba(255,255,0,0.2)] bg-black p-1"
                    >
                        <div className="border border-primary/30 p-6 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(255, 255, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 0, 0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            <div className="absolute inset-x-0 h-[2px] bg-primary/10 z-10 animate-[scan_8s_linear_infinite]" />

                            <div className="relative z-10 flex justify-between items-start mb-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Settings2 className="w-4 h-4" />
                                        <h2 className="text-xs font-bold tracking-widest opacity-70">CORE_OPERATION_REQUEST</h2>
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tighter">
                                        MODULE_INITIALIZATION <span className="text-primary/40 font-light">//</span> DEFINE_SECTOR:
                                    </h1>
                                </div>
                                <button onClick={() => { ArkanAudio.playFast('ui_decline'); onClose(); }} className="hover:bg-primary hover:text-black border border-primary/40 p-1 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative z-10 grid grid-cols-12 gap-8">
                                <div className="col-span-7 flex flex-col gap-6">
                                    <div>
                                        <label className="block text-[10px] mb-2 opacity-60 tracking-widest font-bold">IDENTIFIER_KEY</label>
                                        <div className="flex gap-2">
                                            <input 
                                                className="w-full bg-primary/5 border border-primary/40 text-primary px-3 py-2 text-sm font-mono focus:border-primary focus:shadow-[0_0_10px_rgba(255,255,0,0.4)] outline-none" 
                                                readOnly 
                                                type="text" 
                                                value={identifier}
                                            />
                                            <button onClick={generateId} className="bg-primary/10 border border-primary/40 px-3 hover:bg-primary hover:text-black transition-colors flex items-center justify-center">
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] mb-2 opacity-60 tracking-widest font-bold">SECTOR_ALLOCATION</label>
                                        <select 
                                            value={sector}
                                            onChange={(e) => setSector(e.target.value)}
                                            className="w-full bg-black border border-primary/40 text-primary px-3 py-2 text-sm font-mono focus:border-primary focus:shadow-[0_0_10px_rgba(255,255,0,0.4)] outline-none appearance-none"
                                        >
                                            <option>SECTOR_ALPHA_01 [VIRTUAL]</option>
                                            <option>SECTOR_BRAVO_09 [PHYSICAL]</option>
                                            <option>SECTOR_GAMMA_NULL [ENCRYPTED]</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] mb-2 opacity-60 tracking-widest font-bold">PRIORITY_LEVEL</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['ROUTINE', 'ELEVATED', 'CRITICAL'].map(p => (
                                                <button 
                                                    key={p}
                                                    onClick={() => setPriority(p)}
                                                    className={cn(
                                                        "border text-[11px] py-1 font-bold transition-colors",
                                                        priority === p 
                                                            ? "border-primary bg-primary text-black" 
                                                            : "border-primary/40 hover:border-primary text-primary"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] opacity-60 tracking-widest font-bold">MEMORY_QUOTA_RESERVE</label>
                                            <span className="text-xs">4.2 GB</span>
                                        </div>
                                        <div className="h-2 w-full bg-primary/10 border border-primary/30 relative">
                                            <div className="absolute inset-y-0 left-0 bg-primary w-[65%]"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-5 flex flex-col gap-4 border-l border-primary/20 pl-8">
                                    <div className="p-3 bg-primary/5 border border-primary/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                            <span className="text-[10px] font-bold">KERNEL_STATUS_ACTIVE</span>
                                        </div>
                                        <p className="text-[10px] leading-relaxed opacity-60">
                                            INITIALIZING THE MODULE WILL ALLOCATE THREADS 09 THROUGH 24 TO THE DESIGNATED SECTOR. ENSURE HANDSHAKE PROTOCOLS ARE SYNCED.
                                        </p>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-end gap-2">
                                        <div className="flex justify-between text-[10px] opacity-40">
                                            <span>UP_TIME:</span>
                                            <span>00:05:32</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] opacity-40">
                                            <span>UPLINK:</span>
                                            <span>NOMINAL</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] opacity-40">
                                            <span>ENTROPY:</span>
                                            <span>88%_STABLE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 flex justify-between items-end mt-12 pt-6 border-t border-primary/20">
                                <div className="text-[9px] font-bold opacity-30 tracking-[0.2em] uppercase">
                                    Arkan-Source_v4.0 // System_Admin_Access
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => { ArkanAudio.playFast('ui_decline'); onClose(); }}
                                        className="px-6 py-2 border border-primary/40 text-[11px] font-bold hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 transition-all uppercase"
                                    >
                                        Abort_Session
                                    </button>
                                    <button 
                                        onClick={handleSubmit}
                                        className="px-8 py-2 bg-primary text-black text-[11px] font-black hover:shadow-[0_0_20px_rgba(255,255,0,0.5)] transition-all uppercase flex items-center gap-2"
                                    >
                                        <span>Initiate_Protocol</span>
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </button>
                                </div>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary"></div>
                        </div>
                    </motion.div>

                    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-40 rotate-90 origin-right">
                        <div className="flex items-center gap-4 text-[10px] tracking-widest font-bold">
                            <span>ARKAN_SUBSYSTEMS</span>
                            <div className="h-px w-32 bg-primary"></div>
                            <span>STABLE_REVISION</span>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
}
