import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";

const terminalLogs = [
    ">> INITIALIZING_KERNAL_NODES...",
    ">> SECTOR_CALIBRATION_COMPLETE",
    ">> SYNCING_NEURAL_PATHWAYS...",
    ">> ENCRYPTING_OPERATIONAL_BUFFER...",
    ">> ARKAN_SYSTEM_READY"
];

export function SplashSequence({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        if (step !== 0) return;

        // Step 1: Flicker-In
        const flickerTimer = setTimeout(() => {
            try { ArkanAudio.playFast('system_engage'); } catch (e) { }
            setStep(1);

            // Step 2: Line-by-line logs (triggered after step 1 is set)
            terminalLogs.forEach((log, i) => {
                setTimeout(() => {
                    setLogs(prev => [...prev, log]);
                    try { ArkanAudio.playFast('key_tick'); } catch (e) { }
                }, 500 + i * 400);
            });

            // Step 3: Ready for user click
            setTimeout(() => {
                setStep(2);
            }, 500 + terminalLogs.length * 400 + 500);
        }, 1000);

        return () => clearTimeout(flickerTimer);
    }, []);

    const handleEnter = () => {
        try { ArkanAudio.playFast('confirm'); } catch (e) { }
        setStep(3); // Trigger horizontal split
        setTimeout(onComplete, 800);
    };

    return (
        <AnimatePresence>
            {step <= 3 && (
                <motion.div
                    className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
                    exit={{ opacity: 0 }}
                >
                    {/* Horizontal Split Revealers */}
                    <motion.div
                        initial={{ y: 0 }}
                        animate={step === 3 ? { y: "-100%" } : { y: 0 }}
                        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
                        className="absolute top-0 left-0 w-full h-1/2 bg-black border-b border-primary/20 z-20"
                    />
                    <motion.div
                        initial={{ y: 0 }}
                        animate={step === 3 ? { y: "100%" } : { y: 0 }}
                        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
                        className="absolute bottom-0 left-0 w-full h-1/2 bg-black border-t border-primary/20 z-20"
                    />

                    {/* Logo & Content */}
                    <div className="relative z-30 flex flex-col items-center gap-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={step >= 1 ? {
                                opacity: [0, 1, 0.8, 1, 0.9, 1],
                                scale: [0.95, 1, 0.98, 1]
                            } : {}}
                            transition={{ duration: 0.5, times: [0, 0.1, 0.2, 0.3, 0.4, 0.5] }}
                            className="flex flex-col items-center"
                        >
                            <Terminal className="h-20 w-20 text-primary shadow-[0_0_30px_#ffff0033]" />
                            <h1 className="mt-4 text-6xl font-black text-primary tracking-[0.5em] arkan-title">ARKAN</h1>
                            <div className="h-[2px] w-full bg-primary/20 mt-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={step >= 1 ? { width: "100%" } : {}}
                                    transition={{ duration: 2, ease: "linear" }}
                                    className="h-full bg-primary"
                                />
                            </div>
                        </motion.div>

                        {/* Terminal Logs */}
                        <div className="h-32 flex flex-col gap-2 font-mono text-[10px] text-primary/40 uppercase tracking-widest text-center">
                            {logs.map((log, i) => (
                                <motion.p
                                    key={i}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {log}
                                </motion.p>
                            ))}
                        </div>

                        {/* Action */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={step === 2 ? { opacity: 1 } : {}}
                            className="mt-8"
                        >
                            <button
                                onClick={handleEnter}
                                className="px-12 py-4 bg-primary/5 border-2 border-primary text-primary font-black uppercase tracking-[0.4em] text-xs hover:bg-primary hover:text-black transition-all shadow-[0_0_20px_#ffff0011] hover:shadow-[0_0_40px_#ffff0033] active:scale-95"
                            >
                                Enter_System
                            </button>
                        </motion.div>
                    </div>

                    {/* Background Scanline Pattern */}
                    <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_bottom,transparent_50%,#FFFF00_51%,transparent_100%)] bg-[length:100%_4px]" />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
