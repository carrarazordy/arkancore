import React, { useEffect, useState } from "react";
import { Terminal, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useChronosStore } from "@/store/useChronosStore";

// The single-row, clean "TacticalHeader" reflecting ARKAN OS V2.4 styling
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
    <header className="flex shrink-0 z-50 bg-black border-b border-primary/20 font-mono h-[52px] items-center px-4 justify-between relative overflow-hidden">
      {/* Background overlay subtly indicating module */}
      <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none"></div>

      <div className="flex items-center gap-4 relative z-10">
        {/* OS Icon Square */}
        <div className="w-10 h-10 bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors cursor-default shadow-[0_0_15px_rgba(249,249,6,0.15)] rounded-sm">
            <Terminal className="text-black h-5 w-5" />
        </div>
        
        {/* Title Block */}
        <div className="flex flex-col h-full justify-center">
            <h1 className="text-primary font-black text-xs tracking-widest uppercase m-0 leading-none">ARKAN OS V2.4</h1>
            <p className="text-[#888800] font-bold text-[9px] tracking-[0.2em] uppercase m-0 mt-1 leading-none">MODULE // {getModuleName()}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 relative z-10">
        {/* System Status */}
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#ffff00]"></div>
           <span className="text-primary text-[9px] font-bold tracking-widest uppercase">SYSTEM_STABLE</span>
        </div>

        {/* Hardware Metrics Block (Merged into single line format) */}
        <div className="flex items-center gap-4 text-[#888800] text-[9px] font-bold tracking-widest uppercase">
           <span>CPU: {cpuUsage}%</span>
           <span>MEM: {memUsage}</span>
           <span>NET: {netSpeed}</span>
        </div>

        {/* Separator Line */}
        <div className="h-5 w-[1px] bg-primary/20"></div>

        {/* Clock View */}
        <div className="text-primary text-sm font-black tracking-wider tabular-nums">
           {time || "00:00:00"}
        </div>

        {/* User Avatar Badge Placeholder */}
        <div className="w-9 h-9 border border-primary/20 bg-primary/5 flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer rounded-sm">
            <User className="h-4 w-4 text-primary/60" />
        </div>
      </div>
    </header>
  );
}
