import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    Cpu,
    Link,
    Trash2,
    Zap,
    Lock,
    Copy,
    Edit2,
} from "lucide-react";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useDialogStore } from "@/store/useDialogStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";

interface ContextMenuItem {
    label: string;
    icon: any;
    action: string;
    critical?: boolean;
}

export default function TacticalContextMenu() {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [contextTarget, setContextTarget] = useState<{ id: string, type: string, name: string } | null>(null);

    const handleContextMenu = useCallback((e: MouseEvent) => {
        // Prevent for input elements to keep default text handling
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();

        const contextEl = target.closest('[data-context-target]');
        if (contextEl) {
            setContextTarget({
                id: contextEl.getAttribute('data-context-target') || '',
                type: contextEl.getAttribute('data-context-type') || '',
                name: contextEl.getAttribute('data-context-name') || ''
            });
        } else {
            setContextTarget(null);
        }

        setPosition({ x: e.clientX, y: e.clientY });
        setIsVisible(true);
        ArkanAudio.playFast('system_engage');
    }, []);

    const handleClick = useCallback(() => {
        if (isVisible) setIsVisible(false);
    }, [isVisible]);

    useEffect(() => {
        window.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("click", handleClick);
        return () => {
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("click", handleClick);
        };
    }, [handleContextMenu, handleClick]);

    const items: ContextMenuItem[] = [
        { label: "AI_NODE_EXTRACT", icon: Cpu, action: "EXTRACT" },
        { label: "ENCRYPT_SECTOR", icon: Lock, action: "ENCRYPT" },
        { label: "ESTABLISH_UPLINK", icon: Link, action: "UPLINK" },
        { label: "GENERATE_HASH", icon: HashIcon, action: "HASH" },
        { label: "COPY_NODE_ID", icon: Copy, action: "COPY" },
    ];

    if (contextTarget?.type === 'TASK' || contextTarget?.type === 'FOLDER') {
        items.push({ label: "RENAME_NODE", icon: Edit2, action: "RENAME" });
    }

    items.push({ label: "DE_MANIFEST", icon: Trash2, action: "DELETE", critical: true });

    const performAction = (action: string) => {
        ArkanAudio.playFast('confirm');
        setIsVisible(false);
        console.log(`>> ACTION: ${action}`);

        if (action === "DELETE" && contextTarget?.type === "PROJECT") {
            useDialogStore.getState().openDialog({
                title: `PURGE PROTOCOL // ${contextTarget.name}`,
                confirmLabel: "PURGE_DATA",
                hideInput: true,
                onConfirm: async () => {
                    await useProjectStore.getState().deleteProject(contextTarget.id);
                    ArkanAudio.playFast('system_purge');
                }
            });
        }
        else if (action === "COPY" && contextTarget) {
            navigator.clipboard.writeText(contextTarget.id);
            ArkanAudio.playFast('clack');
        }
        else if (action === "RENAME" && contextTarget) {
            useDialogStore.getState().openDialog({
                title: `RENAME PROTOCOL // ${contextTarget.name}`,
                placeholder: "ENTER_NEW_DESIGNATION...",
                confirmLabel: "UPDATE_RECORD",
                onConfirm: async (val) => {
                    if (val && contextTarget.type === 'TASK') {
                        await useTaskStore.getState().updateTask(contextTarget.id, { title: val });
                        ArkanAudio.playFast('system_execute_clack');
                    }
                }
            });
        }
    };

    if (!isVisible) return null;

    return (
        <div
            className="fixed z-[3000] w-56 bg-black border border-primary/40 shadow-[0_0_30px_rgba(249,249,6,0.2)] animate-in fade-in zoom-in duration-200"
            style={{ top: position.y, left: position.x }}
        >
            <div className="bg-primary/10 px-3 py-1.5 border-b border-primary/20 flex justify-between items-center">
                <span className="text-[8px] font-mono text-primary font-bold tracking-widest uppercase">Tactical_Actions</span>
                <Zap className="h-2 w-2 text-primary animate-pulse" />
            </div>

            <div className="py-1">
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => performAction(item.action)}
                        onMouseEnter={() => ArkanAudio.play('ui_hover_shimmer')}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 hover:bg-primary/20 transition-all group",
                            item.critical ? "hover:bg-red-500/20" : ""
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className={cn(
                                "h-3.5 w-3.5",
                                item.critical ? "text-red-500" : "text-primary/60 group-hover:text-primary"
                            )} />
                            <span className={cn(
                                "text-[10px] font-mono uppercase font-black tracking-tighter",
                                item.critical ? "text-red-500" : "text-primary/80 group-hover:text-primary"
                            )}>
                                {item.label}
                            </span>
                        </div>
                        <ChevronRight className="h-2 w-2 opacity-0 group-hover:opacity-40" />
                    </button>
                ))}
            </div>

            <div className="bg-[#050502] px-3 py-1 border-t border-primary/10 flex justify-between items-center text-[7px] text-primary/20 uppercase font-mono">
                <span>SEC_LVL: ALPHA</span>
                <span>Buffer: Ready</span>
            </div>
        </div>
    );
}

function HashIcon({ className }: { className?: string }) {
    return <span className={cn("font-bold text-xs select-none", className)}>#</span>;
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}
