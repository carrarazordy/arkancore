import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ProjectHeaderBarProps {
  projectName: string;
  uptime: number;
  onBack: () => void;
}

export function ProjectHeaderBar({ projectName, uptime, onBack }: ProjectHeaderBarProps) {
  return (
    <header className="h-16 border-b border-primary/10 flex items-center justify-between px-8 bg-black/40 mb-6 rounded-lg border border-primary/10">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary/60 hover:text-primary transition-colors group">
          <ArrowLeft className="h-4 w-4" />
          <span>[ BACK_TO_GRID ]</span>
        </button>
        <div className="h-4 w-px bg-primary/20"></div>
        <div className="text-xs font-medium tracking-[0.2em] text-primary">
          ARKAN // PROJECTS // <span className="text-white">{projectName}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-[10px] tracking-tighter text-primary/80 uppercase">System: Synchronized</span>
        </div>
        <div className="flex items-center gap-4 border-l border-primary/20 pl-6">
          <span className="text-xs text-primary/40">SESSION_RUNTIME: {new Date(uptime).toISOString().substr(11, 8)}</span>
        </div>
      </div>
    </header>
  );
}

export function TelemetryStatusCard({ progress }: { progress: number }) {
  return (
    <div className="bg-[#1a1a0a]/50 rounded-lg border border-primary/10 p-5 relative">
      <h3 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-4">Telemetry_Status</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-xs text-primary/40">TASK_COMPLETION</span>
          <span className="text-xl font-bold text-white">{progress}%</span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-primary shadow-[0_0_10px_rgba(249,249,6,0.3)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-[10px] text-primary/40 uppercase">Time Invested</p>
            <p className="text-sm font-medium text-primary">14.5 HRS</p>
          </div>
          <div>
            <p className="text-[10px] text-primary/40 uppercase">Uptime</p>
            <p className="text-sm font-medium text-primary">99.98%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollaboratorsCard() {
  return (
    <div className="flex-1 bg-[#1a1a0a]/50 rounded-lg border border-primary/10 p-5">
      <h3 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-4">COLLABORATOR_STATUS</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">EL</div>
            <span className="text-xs text-white/70">Elias.L</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold text-primary/40">SK</div>
            <span className="text-xs text-white/70">Sarah.K</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-primary/20"></span>
        </div>
      </div>
    </div>
  );
}
