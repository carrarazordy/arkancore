import React, { useState, useEffect, useRef } from "react";
import { useSearchStore, SearchResult } from "@/store/useSearchStore";
import { cn } from "@/lib/utils";
import {
    Search,
    Terminal,
    ChevronRight,
    Clock,
    Command,
    FolderKanban,
    FileText,
    Calendar,
    Activity
} from "lucide-react";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";

export function OmniSearch() {
    const { query, setQuery, executeSearch, results, clearResults, isOpen, toggleSearch } = useSearchStore();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Global Cmd+K Listener
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                toggleSearch(true);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [toggleSearch]);

    useEffect(() => {
        if (isOpen) {
            // Delay focus slightly to ensure modal is rendered
            setTimeout(() => inputRef.current?.focus(), 50);
            ArkanAudio.playFast('shimmer');
        } else {
            setQuery("");
            setSelectedIndex(0);
        }
    }, [isOpen, setQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") toggleSearch(false);
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
            ArkanAudio.playFast('key_tick');
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
            ArkanAudio.playFast('key_tick');
        }
        if (e.key === "Enter") {
            handleSelect(results[selectedIndex]);
        }
    };

    const handleSelect = (result: SearchResult) => {
        if (!result) return;
        ArkanAudio.playFast('confirm');
        console.log(`>> SYSTEM_EXECUTE: ${result.action || result.title}`);

        // Handle theme commands
        if (result.action?.startsWith('SET_THEME_')) {
            const theme = result.action.replace('SET_THEME_', '').toLowerCase();
            document.documentElement.setAttribute('data-theme', theme);
        }

        toggleSearch(false);
    };

    const renderTitle = (title: string, match: string) => {
        if (!match) return <span>{title}</span>;
        // Strip prefixes for highlighting
        const cleanMatch = match.replace(/^[\/>#]/, "").trim();
        if (!cleanMatch) return <span>{title}</span>;

        const parts = title.split(new RegExp(`(${cleanMatch})`, "gi"));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === cleanMatch.toLowerCase() ? (
                        <span key={i} className="text-primary font-black drop-shadow-[0_0_8px_#ffff00]">{part}</span>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-start justify-center pt-[15vh] px-4"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={() => toggleSearch(false)}
            />

            {/* Search Container */}
            <div className="w-full max-w-2xl bg-[#0a0a05] border-2 border-primary/40 shadow-[0_0_50px_rgba(249,249,6,0.3)] overflow-hidden relative animate-in slide-in-from-top-4 duration-300 rounded-lg">
                <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

                {/* Input Section */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-primary/20 bg-primary/5">
                    <Search className="h-5 w-5 text-primary/60" />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none outline-none text-primary font-mono text-lg placeholder:text-primary/20 uppercase font-black"
                        placeholder="ENTER_QUERY... [/t | /n | /p | # | >]"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            executeSearch(e.target.value);
                            setSelectedIndex(0);
                            ArkanAudio.playFast('key_tick');
                        }}
                    />
                    <div className="flex items-center gap-2 text-[10px] font-mono text-primary/40">
                        <kbd className="px-1.5 py-0.5 border border-primary/20 rounded">ESC</kbd>
                        <span>to exit</span>
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-2">
                    {results.length > 0 ? (
                        results.map((result, idx) => {
                            const Icon = result.type === 'TASK' ? FolderKanban :
                                result.type === 'NOTE' ? FileText :
                                    result.type === 'EVENT' ? Calendar :
                                        result.type === 'COMMAND' ? Terminal : Activity;

                            return (
                                <div
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={cn(
                                        "flex items-center gap-4 px-6 py-4 cursor-pointer border-l-4 transition-all duration-200",
                                        selectedIndex === idx
                                            ? "bg-primary/20 border-primary translate-x-1"
                                            : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <Icon className={cn(
                                        "h-5 w-5",
                                        selectedIndex === idx ? "text-primary" : "text-primary/40"
                                    )} />

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black tracking-tight uppercase font-mono">
                                                {renderTitle(result.title, query)}
                                            </span>
                                            <span className="text-[8px] font-mono bg-primary/20 text-primary px-1 border border-primary/20">
                                                {result.type}
                                            </span>
                                        </div>
                                        {result.description && (
                                            <p className="text-[10px] text-primary/40 mt-1 font-mono uppercase truncate">
                                                {result.description}
                                            </p>
                                        )}
                                    </div>

                                    {selectedIndex === idx && (
                                        <ChevronRight className="h-4 w-4 text-primary animate-pulse" />
                                    )}
                                </div>
                            );
                        })
                    ) : query !== "" ? (
                        <div className="px-6 py-10 text-center flex flex-col items-center gap-4">
                            <Activity className="h-8 w-8 text-primary/20 animate-pulse" />
                            <p className="text-[10px] font-mono text-primary/40 uppercase tracking-[0.3em]">
                                No_System_Nodes_Matched_Query_"{query}"
                            </p>
                        </div>
                    ) : (
                        <div className="px-6 py-10 flex flex-col items-center gap-6">
                            <Clock className="h-10 w-10 text-primary/10" />
                            <div className="space-y-2 text-center">
                                <p className="text-[10px] font-mono text-primary/40 uppercase tracking-widest">Recent_Activity_Stream</p>
                                <div className="flex flex-col gap-1 italic opacity-30">
                                    <span className="text-[9px] font-mono tracking-tighter">ARK-CORE-UP-S2 // 2H AGO</span>
                                    <span className="text-[9px] font-mono tracking-tighter">OP-SYNC-ALPHA // 4H AGO</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Decor */}
                <div className="px-6 py-3 bg-primary/5 border-t border-primary/10 flex justify-between items-center text-[9px] font-mono text-primary/40">
                    <div className="flex items-center gap-4 opacity-30">
                        <span>SEARCH_MODE: ALGORITHMIC_FUZZY</span>
                        <span>LATENCY: 22ms</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Command className="h-2 w-2" />
                        <span>ENTER to Execute</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
