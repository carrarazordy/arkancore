import React from "react";
import { Zap, Trash2 } from "lucide-react";

interface SharedProjectCardProps {
  project: any;
  onExpand: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string, name: string) => void;
  onHoverSound: () => void;
  variant?: 'compact' | 'detailed';
}

export function SharedProjectCard({ project, onExpand, onDelete, onHoverSound, variant = 'compact' }: SharedProjectCardProps) {
  const isDetailed = variant === 'detailed';

  return (
    <div
      onClick={() => onExpand(project.id)}
      className="cursor-pointer group"
      data-context-target={project.id}
      data-context-type="PROJECT"
      data-context-name={project.name}
    >
      <div className={`border border-primary/10 transition-all group relative overflow-hidden flex flex-col justify-between ${
        isDetailed 
          ? "bg-[#23230f]/40 hover:border-primary/40 p-6 rounded-xl h-64" 
          : "bg-[#0a0a05] p-5 rounded-sm hover:border-primary/60 hover:bg-primary/[0.02] duration-150 group-hover:shadow-[0_0_20px_rgba(249,249,6,0.1)] h-44"
      }`}>
        <div className="absolute top-0 right-0 p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={(e) => onDelete(e, project.id, project.name)}
            onMouseEnter={onHoverSound}
            className="p-1 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 rounded transition-colors"
          >
            <Trash2 className={isDetailed ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </button>
          <div className={`p-1 ${isDetailed ? "text-primary/80" : "text-primary/60"}`}>
            <Zap className={isDetailed ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </div>
        </div>
        
        <div>
          {isDetailed ? (
            <>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono text-primary/60 tracking-tighter">ID: {project.technicalId}</span>
                <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">[{project.status === 'active' ? 'RUNNING' : 'STALLED'}]</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
              <p className="text-slate-400 text-sm mb-6 line-clamp-2">{project.description || "No description provided."}</p>
            </>
          ) : (
            <>
              <div className="text-[8px] font-mono text-primary/30 mb-1 uppercase tracking-widest">ID: {project.technicalId}</div>
              <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase group-hover:text-primary transition-colors">{project.name}</h3>
            </>
          )}
        </div>

        <div className={isDetailed ? "space-y-3" : "space-y-2"}>
          <div className={isDetailed ? "flex justify-between text-[10px] font-mono" : "flex justify-between text-[8px] uppercase text-primary/30 font-bold tracking-widest"}>
            <span className={isDetailed ? "text-slate-500" : ""}>{isDetailed ? "COMPLETION" : "Progress"}</span>
            <span className={isDetailed ? "text-primary font-bold" : ""}>{project.progress}%</span>
          </div>
          <div className={`w-full bg-white/5 overflow-hidden ${isDetailed ? "h-1 rounded-full" : "h-1 rounded-full border border-primary/5"}`}>
            <div className={`bg-primary h-full transition-all duration-500 shadow-[0_0_8px_#ffff00] ${isDetailed ? "rounded-full" : ""}`} style={{ width: `${project.progress}%` }}></div>
          </div>
          {isDetailed && (
            <div className="flex gap-2 pt-2">
              <span className="w-6 h-6 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-slate-400">FE</span>
              <span className="w-6 h-6 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-slate-400">API</span>
              <span className="ml-auto flex -space-x-2">
                <img className="w-6 h-6 rounded-full border border-black" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDA5FRqpAZq7Q9suenTyht-BwAAzNr-1rUPfr2RX-RO5S6uba7b3GQCbnXqtDZc1MkdWiErpkJnHk2QnmutIQhZ2NksmXyQ8aHSBojwQO3QRt8zAHWAZC4YV_oS2yHR8ajOJcpYnr3a49GMamyIEa5iqYFVe09-hRMacfO8eGM0jxZOhNLITrGSwO2fXFyx1U_eWe_d032Z_Z2FaiZZwO6J9dDGcTymfaM608FDddJyaUCvd_A_a9s0pjbyneNkvJeT7x7GIsTG4aA" alt="Team member" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
