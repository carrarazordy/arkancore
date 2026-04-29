import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { Project, useProjectStore } from "@/store/useProjectStore";
import { Settings2, RefreshCw, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_SECTOR = "SECTOR_ALPHA_01 [VIRTUAL]";
const DEFAULT_PRIORITY = "ROUTINE";

type ModuleInitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onSaved?: (projectId: string) => void;
};

function buildProjectDescription(sector: string, missionBrief: string) {
  const normalizedBrief = missionBrief.trim();
  if (!normalizedBrief) {
    return `SECTOR: ${sector}`;
  }

  return `SECTOR: ${sector} // ${normalizedBrief}`;
}

function extractSector(description?: string) {
  if (!description) {
    return DEFAULT_SECTOR;
  }

  const sectorMatch = description.match(/^SECTOR:\s*(.*?)(?:\s*\/\/|$)/);
  if (sectorMatch?.[1]) {
    return sectorMatch[1].trim();
  }

  return DEFAULT_SECTOR;
}

function extractMissionBrief(description?: string) {
  if (!description) {
    return "";
  }

  const prefixMatch = description.match(/^SECTOR:\s*.*?\/\/\s*(.*)$/);
  if (prefixMatch?.[1]) {
    return prefixMatch[1].trim();
  }

  return description;
}

export function ModuleInitModal({ isOpen, onClose, project = null, onSaved }: ModuleInitModalProps) {
  const { addProject, updateProject, projects } = useProjectStore();
  const [projectName, setProjectName] = useState("");
  const [technicalId, setTechnicalId] = useState("");
  const [sector, setSector] = useState(DEFAULT_SECTOR);
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [missionBrief, setMissionBrief] = useState("");

  const generateTechnicalIdPreview = () => {
    const nextProjectNumber =
      projects.reduce((maxValue, currentProject) => {
        const match = currentProject.technicalId.match(/^PRJ-(\d+)$/i);
        return Math.max(maxValue, match ? Number(match[1]) : 0);
      }, 0) + 1;

    setTechnicalId(`PRJ-${String(nextProjectNumber).padStart(3, "0")}`);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    ArkanAudio.playFast("ui_modal_open");
    setProjectName(project?.name ?? "");
    setSector(extractSector(project?.description));
    setPriority(project?.status ?? DEFAULT_PRIORITY);
    setMissionBrief(extractMissionBrief(project?.description));

    if (project?.technicalId) {
      setTechnicalId(project.technicalId);
    } else {
      generateTechnicalIdPreview();
    }
  }, [isOpen, project, projects]);

  const handleSubmit = async () => {
    const normalizedName = projectName.trim();
    if (!normalizedName) {
      return;
    }

    const nextDescription = buildProjectDescription(sector, missionBrief);

    if (project) {
      await updateProject(project.id, {
        name: normalizedName,
        technicalId,
        status: priority,
        description: nextDescription,
      });
      onSaved?.(project.id);
    } else {
      const createdProject = addProject({
        name: normalizedName,
        technicalId,
        progress: 0,
        status: priority,
        description: nextDescription,
      });
      onSaved?.(createdProject.id);
    }

    ArkanAudio.playFast("system_execute_clack");
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-mono text-primary">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-[2px]"
            onClick={() => {
              ArkanAudio.playFast("ui_decline");
              onClose();
            }}
          />

          <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-20 scale-105 blur-sm">
            <div className="h-3/4 w-full max-w-5xl border border-primary/30 p-8">
              <div className="mb-4 h-12 border border-primary/30" />
              <div className="flex h-[calc(100%-4rem)] gap-4">
                <div className="h-full w-64 border border-primary/30" />
                <div className="relative h-full flex-1 overflow-hidden border border-primary/30">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(217, 249, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(217, 249, 0, 0.05) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                </div>
                <div className="h-full w-80 border border-primary/30" />
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-50 w-full max-w-3xl border border-primary bg-black p-1 shadow-[0_0_15px_rgba(255,255,0,0.2)]"
          >
            <div className="relative overflow-hidden border border-primary/30 p-6">
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255, 255, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 0, 0.05) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="absolute inset-x-0 z-10 h-[2px] bg-primary/10 animate-[scan_8s_linear_infinite]" />

                <div className="relative z-10 mb-10 flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      <h2 className="text-xs font-bold tracking-widest opacity-70">CORE_OPERATION_REQUEST</h2>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tighter">
                      {project ? "MODULE_RECONFIGURATION" : "MODULE_INITIALIZATION"} <span className="font-light text-primary/40">//</span> DEFINE_PARAMETERS:
                    </h1>
                  </div>
                <button
                  type="button"
                  onClick={() => {
                    ArkanAudio.playFast("ui_decline");
                    onClose();
                  }}
                  className="border border-primary/40 p-1 transition-colors hover:bg-primary hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative z-10 grid grid-cols-12 gap-8">
                <div className="col-span-7 flex flex-col gap-6">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest opacity-60">MODULE_NAME</label>
                    <input
                      className="w-full border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-mono text-primary outline-none focus:border-primary focus:shadow-[0_0_10px_rgba(255,255,0,0.4)]"
                      type="text"
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="PROJECT_ORION"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest opacity-60">PROJECT_CODE</label>
                    <div className="flex gap-2">
                      <input
                        className="w-full border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-mono text-primary outline-none focus:border-primary focus:shadow-[0_0_10px_rgba(255,255,0,0.4)]"
                        type="text"
                        value={technicalId}
                        onChange={(event) => setTechnicalId(event.target.value)}
                        placeholder="PRJ-003"
                      />
                      <button
                        type="button"
                        onClick={generateTechnicalIdPreview}
                        className="flex items-center justify-center border border-primary/40 bg-primary/10 px-3 transition-colors hover:bg-primary hover:text-black"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest opacity-60">SECTOR_ALLOCATION</label>
                    <input
                      value={sector}
                      onChange={(event) => setSector(event.target.value)}
                      className="w-full border border-primary/40 bg-black px-3 py-2 text-sm font-mono text-primary outline-none focus:border-primary focus:shadow-[0_0_10px_rgba(255,255,0,0.4)]"
                      placeholder="SECTOR_ALPHA_01 [VIRTUAL]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest opacity-60">PRIORITY_LEVEL</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["ROUTINE", "ELEVATED", "CRITICAL"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPriority(value)}
                          className={cn(
                            "border py-1 text-[11px] font-bold transition-colors",
                            priority === value
                              ? "border-primary bg-primary text-black"
                              : "border-primary/40 text-primary hover:border-primary"
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest opacity-60">MISSION_BRIEF</label>
                    <textarea
                      value={missionBrief}
                      onChange={(event) => setMissionBrief(event.target.value)}
                      placeholder="DEFINE_OBJECTIVE_AND_NOTES..."
                      className="min-h-[120px] w-full resize-none border border-primary/40 bg-black px-3 py-3 text-sm font-mono text-primary outline-none focus:border-primary focus:shadow-[0_0_10px_rgba(255,255,0,0.4)] placeholder:text-primary/25"
                    />
                  </div>

                  <div className="pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-bold tracking-widest opacity-60">MEMORY_QUOTA_RESERVE</label>
                      <span className="text-xs">4.2 GB</span>
                    </div>
                    <div className="relative h-2 w-full border border-primary/30 bg-primary/10">
                      <div className="absolute inset-y-0 left-0 w-[65%] bg-primary" />
                    </div>
                  </div>
                </div>

                <div className="col-span-5 flex flex-col gap-4 border-l border-primary/20 pl-8">
                  <div className="border border-primary/20 bg-primary/5 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-bold">{project ? "MODULE_UPDATE_READY" : "KERNEL_STATUS_ACTIVE"}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed opacity-60">
                      {project
                        ? "UPDATE THE ACTIVE MODULE METADATA BELOW. SAVING WILL APPLY THE NEW LABEL, STATUS, AND MISSION BRIEF IMMEDIATELY."
                        : "INITIALIZING THE MODULE WILL CREATE A NEW ACTIVE OPERATION STREAM WITH THE LABELS AND STATUS YOU DEFINE HERE."}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
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

              <div className="relative z-10 mt-12 flex items-end justify-between border-t border-primary/20 pt-6">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30">
                  Arkan-Source_v4.0 // System_Admin_Access
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      ArkanAudio.playFast("ui_decline");
                      onClose();
                    }}
                    className="border border-primary/40 px-6 py-2 text-[11px] font-bold uppercase transition-all hover:border-red-500 hover:bg-red-500/10 hover:text-red-500"
                  >
                    Abort_Session
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex items-center gap-2 bg-primary px-8 py-2 text-[11px] font-black uppercase text-black transition-all hover:shadow-[0_0_20px_rgba(255,255,0,0.5)]"
                  >
                    <span>{project ? "Save_Module" : "Initiate_Protocol"}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-primary" />
              <div className="absolute right-0 top-0 h-2 w-2 border-r border-t border-primary" />
              <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-primary" />
              <div className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-primary" />
            </div>
          </motion.div>

          <div className="pointer-events-none fixed right-8 top-1/2 z-50 origin-right -translate-y-1/2 rotate-90 opacity-40">
            <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest">
              <span>ARKAN_SUBSYSTEMS</span>
              <div className="h-px w-32 bg-primary" />
              <span>STABLE_REVISION</span>
            </div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return null;
}
