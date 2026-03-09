import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { useHardwareMetrics } from "@/store/useHardwareMetrics";
import { cn } from "@/lib/utils";

export function HardwareHUD() {
    const { logs } = useSystemLogStore();
    const { metrics, updateMetrics } = useHardwareMetrics();
    const [time, setTime] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            updateMetrics();
            const now = new Date();
            setTime(now.toLocaleTimeString());
        }, 3000);
        return () => clearInterval(interval);
    }, [updateMetrics]);

    return (
        <footer className="h-28 bg-black/60 border-t border-primary/30 flex p-3 gap-4 shrink-0 z-30 font-mono relative">
            {/* Log Section */}
            <div className="w-20 bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                <Activity className="text-primary h-6 w-6 animate-pulse" />
                <span className="text-[9px] text-primary mt-1 font-bold tracking-widest uppercase">Logs</span>
            </div>

            <div className="flex-1 bg-black/60 border border-primary/10 p-3 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-1 opacity-20">
                    <RefreshCw className="h-3 w-3 text-primary animate-[spin_4s_linear_infinite]" />
                </div>
                <div className="text-[10px] space-y-1.5 overflow-y-auto h-full custom-scrollbar pr-4">
                    {logs.map((log) => (
                        <p key={log.id} className={cn(
                            "tracking-tighter",
                            log.type === 'error' ? "text-red-500/70" :
                                log.type === 'status' ? "text-green-500/70" :
                                    "text-primary/50"
                        )}>
                            &gt; [{log.timestamp}] [{log.type.toUpperCase()}] {log.message}
                        </p>
                    ))}
                </div>
                <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]"></div>
            </div>

            {/* Metrics Section */}
            <div className="flex-1 max-w-sm flex gap-4">
                <div className="flex-1 bg-primary/5 border border-primary/20 p-3 flex flex-col justify-between shrink-0">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-primary/60 uppercase">CPU_CORE_LOAD</span>
                            <span className="text-primary font-bold">{metrics.cpu}%</span>
                        </div>
                        <div className="w-full h-1 bg-primary/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary shadow-[0_0_5px_#ffff00] transition-all duration-1000"
                                style={{ width: `${metrics.cpu}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-primary/60 uppercase">MEMORY_POOL</span>
                            <span className="text-primary font-bold">{metrics.ram}GB</span>
                        </div>
                        <div className="w-full h-1 bg-primary/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary shadow-[0_0_5px_#ffff00] transition-all duration-1000"
                                style={{ width: `${(metrics.ram / 32) * 100}%` }} // Mock 32GB total
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Logistics Uplink Telemetry */}
                <div className="w-40 bg-black/40 border border-primary/20 p-3 flex flex-col justify-between shrink-0 overflow-hidden relative group">
                    <div className="flex justify-between items-start">
                        <span className="text-[8px] font-bold text-primary/40 uppercase tracking-widest">Uplink_Status</span>
                        <div className="flex gap-[1px]">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="w-[3px] h-[3px] bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-1">
                        <span className="text-[14px] font-bold text-primary tracking-tighter">DATA_SYNC</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                            <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase">NOMINAL</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-primary/10 pt-2 mt-2">
                        <span className="text-[8px] text-primary/40 uppercase">Sync_Rate</span>
                        <span className="text-[10px] text-primary font-bold">12ms</span>
                    </div>

                    {/* Matrix Effect Background for Sync */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(circle,var(--color-primary)_1px,transparent_1px)] bg-[length:4px_4px]"></div>
                </div>
            </div>

            {/* Visual Scanline Effect Overlay (PWA feeling) */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-primary/30 blur-[1px] opacity-20 animate-pulse pointer-events-none"></div>
        </footer>
    );
}
