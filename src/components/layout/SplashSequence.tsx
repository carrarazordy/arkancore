import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";

const terminalLogs = [
    "[00:01:24]  >> SYSTEM CORE: INITIALIZED",
    "[00:01:25]  >> NEURAL MAPPING: COMPLETE",
    "[00:01:25]  >> ENCRYPTION ACTIVE [AES-256]",
    "[00:01:26]  >> AWAITING OPERATOR INPUT"
];

export function SplashSequence({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        if (step !== 0) return;

        const flickerTimer = setTimeout(() => {
            try { ArkanAudio.playFast('system_engage'); } catch {}
            setStep(1);

            terminalLogs.forEach((log, i) => {
                setTimeout(() => {
                    setLogs(prev => [...prev, log]);
                    try { ArkanAudio.playFast('key_tick'); } catch {}
                }, 450 + i * 320);
            });

            setTimeout(() => {
                setStep(2);
            }, 450 + terminalLogs.length * 320 + 420);
        }, 850);

        return () => clearTimeout(flickerTimer);
    }, [step]);

    const handleEnter = () => {
        try { ArkanAudio.playFast('confirm'); } catch {}
        setStep(3);
        setTimeout(onComplete, 800);
    };

    return (
        <AnimatePresence>
            {step <= 3 && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black text-primary font-mono"
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,0,0.12),transparent_30%),radial-gradient(circle_at_center,rgba(255,255,0,0.05),transparent_48%)]" />
                    <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.48),rgba(0,0,0,0.2))]" />

                    <motion.div
                        initial={{ y: 0 }}
                        animate={step === 3 ? { y: "-100%" } : { y: 0 }}
                        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
                        className="absolute top-0 left-0 z-20 h-1/2 w-full border-b border-primary/20 bg-black/90"
                    />
                    <motion.div
                        initial={{ y: 0 }}
                        animate={step === 3 ? { y: "100%" } : { y: 0 }}
                        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
                        className="absolute bottom-0 left-0 z-20 h-1/2 w-full border-t border-primary/20 bg-black/90"
                    />

                    <div className="pointer-events-none absolute left-4 top-4 z-30 h-28 w-32 border-l border-t border-primary/50 sm:left-8 sm:top-8 sm:w-40">
                        <div className="px-4 pt-4 text-[10px] uppercase tracking-[0.22em] text-primary/80">
                            <div className="mb-1 text-primary/55">SYSTEM STATUS</div>
                            <div className="flex items-center gap-2 text-primary">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>SECURE CONNECTION ESTABLISHED</span>
                            </div>
                        </div>
                    </div>

                    <div className="pointer-events-none absolute right-4 top-4 z-30 h-28 w-32 border-r border-t border-primary/50 text-right sm:right-8 sm:top-8 sm:w-40">
                        <div className="px-4 pt-4 text-[10px] uppercase tracking-[0.22em] text-primary/80">
                            <div className="mb-1 text-primary/55">NODE IDENTIFICATION</div>
                            <div>ARKAN_OS v4.0.2-ALPHA</div>
                        </div>
                    </div>

                    <div className="pointer-events-none absolute bottom-4 left-4 z-30 h-28 w-32 border-b border-l border-primary/50 sm:bottom-8 sm:left-8 sm:w-40">
                        <div className="absolute bottom-4 left-4 text-[10px] uppercase tracking-[0.18em] text-primary/60">
                            BUFFERING NEURAL INTERFACE // 68%
                        </div>
                    </div>

                    <div className="pointer-events-none absolute bottom-4 right-4 z-30 h-28 w-40 border-b border-r border-primary/50 sm:bottom-8 sm:right-8 sm:w-52">
                        <div className="absolute bottom-4 right-4 max-w-[170px] text-right text-[10px] uppercase leading-snug tracking-[0.16em] text-primary/45">
                            Unauthorized access is strictly prohibited. All interactions are monitored and encrypted.
                        </div>
                    </div>

                    <div className="relative z-30 flex w-full max-w-4xl flex-col items-center px-6 text-center sm:px-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={step >= 1 ? {
                                opacity: [0, 1, 0.86, 1, 0.92, 1],
                                scale: [0.97, 1, 0.985, 1]
                            } : {}}
                            transition={{ duration: 0.55, times: [0, 0.16, 0.3, 0.42, 0.55, 1] }}
                            className="w-full"
                        >
                            <h1 className="text-center text-[62px] font-black uppercase tracking-[0.28em] text-primary drop-shadow-[0_0_24px_rgba(255,255,0,0.9)] sm:text-[96px] lg:text-[128px]">
                                ARKAN
                            </h1>
                            <div className="mx-auto mt-4 flex max-w-[530px] items-center gap-4 text-[11px] font-bold uppercase tracking-[0.42em] text-primary/65 sm:mt-6">
                                <div className="h-px flex-1 bg-primary/20" />
                                <span>CORE ENGINE</span>
                                <div className="h-px flex-1 bg-primary/20" />
                            </div>
                        </motion.div>

                        <div className="mt-10 min-h-[120px] w-full max-w-[460px] bg-black/20 px-4 py-3 sm:px-6">
                            <div className="space-y-3 text-left text-[13px] font-bold uppercase tracking-[0.12em] text-primary/85">
                                {logs.map((log, i) => (
                                    <motion.p
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {log}
                                    </motion.p>
                                ))}
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={step === 2 ? { opacity: 1, y: 0 } : {}}
                            className="mt-10"
                        >
                            <button
                                onClick={handleEnter}
                                className="group flex items-center gap-4 border border-primary/60 bg-primary/5 px-10 py-5 text-[14px] font-black uppercase tracking-[0.34em] text-primary transition-all hover:bg-primary/10 hover:shadow-[0_0_30px_rgba(255,255,0,0.12)] sm:px-14"
                            >
                                <span>ENTER SYSTEM</span>
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>
                        </motion.div>
                    </div>

                    <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_bottom,transparent_50%,#FFFF00_51%,transparent_100%)] bg-[length:100%_4px]" />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
