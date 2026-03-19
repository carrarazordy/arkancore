import React, { useEffect, useState } from "react";
import { Terminal, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useChronosStore } from "@/store/useChronosStore";

export function TacticalHeader() {
  const { cpuUsage, memUsage, netSpeed } = useChronosStore();
  const [time, setTime] = useState("");
  const location = useLocation();

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const getModuleName = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'COMMAND_CENTER';
    if (path.includes('operation')) return 'PROJECT_OPERATIONS';
    if (path.includes('kanban')) return 'KANBAN_BOARD';
    if (path.includes('note')) return 'NEURAL_ARCHIVE';
    if (path.includes('timer')) return 'CHRONOS_HUB';
    if (path.includes('calendar')) return 'TEMPORAL_SCHEDULER';
    if (path.includes('archive')) return 'HISTORICAL_ARCHIVE';
    if (path.includes('expeditions')) return 'EXPEDITION_PLANNER';
    if (path === '/') return 'SYSTEM_INITIALIZATION';
    return 'SYSTEM_CORE';
  };

  return (
    <header className="relative z-50 flex min-h-[60px] shrink-0 items-center justify-between overflow-hidden border-b border-primary/20 bg-black px-3 py-2 pl-16 font-mono sm:h-[52px] sm:min-h-0 sm:px-4 sm:py-0 sm:pl-4">
      <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none"></div>

      <div className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/90 shadow-[0_0_15px_rgba(249,249,6,0.15)] lg:flex">
          <Terminal className="h-5 w-5 text-black" />
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <h1 className="m-0 truncate text-[11px] font-black uppercase leading-none tracking-[0.22em] text-primary sm:text-xs sm:tracking-widest">ARKAN OS V2.4</h1>
          <p className="m-0 mt-1 truncate text-[8px] font-bold uppercase leading-none tracking-[0.16em] text-[#888800] sm:text-[9px] sm:tracking-[0.2em]">
            MODULE // {getModuleName()}
          </p>
        </div>
      </div>

      <div className="relative z-10 ml-3 flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-6">
        <div className="hidden items-center gap-2 md:flex">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_#ffff00] animate-pulse"></div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary">SYSTEM_STABLE</span>
        </div>

        <div className="hidden items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-[#888800] xl:flex">
          <span>CPU: {cpuUsage}%</span>
          <span>MEM: {memUsage}</span>
          <span>NET: {netSpeed}</span>
        </div>

        <div className="hidden h-5 w-px bg-primary/20 xl:block"></div>

        <div className="text-xs font-black tracking-[0.18em] text-primary tabular-nums sm:text-sm sm:tracking-wider">
          {time || "00:00:00"}
        </div>

        <div className="hidden h-9 w-9 items-center justify-center rounded-sm border border-primary/20 bg-primary/5 transition-colors hover:border-primary/50 lg:flex">
          <User className="h-4 w-4 text-primary/60" />
        </div>
      </div>
    </header>
  );
}
