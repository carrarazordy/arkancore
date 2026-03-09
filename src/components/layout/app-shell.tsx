import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { GlobalInbox } from "./GlobalInbox";
import { TacticalHeader } from "./TacticalHeader";
import { HardwareHUD } from "./HardwareHUD";
import { OmniSearch } from "./OmniSearch";
import TacticalContextMenu from "./TacticalContextMenu";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import { useTaskStore } from "@/store/useTaskStore";
import { supabase } from "@/lib/supabase";
import { SplashSequence } from "./SplashSequence";
import { ModuleInitModal } from "../ui/ModuleInitModal";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useChronosStore } from "@/store/useChronosStore";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { ArkanCommands } from "@/lib/commands";

import { useUIStore } from "@/store/useUIStore";

export function AppShell({ children }: { children: React.ReactNode }) {
    const { isNewProjectModalOpen, setIsNewProjectModalOpen } = useUIStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [inboxCollapsed, setInboxCollapsed] = useState(false);
    const [showSplash, setShowSplash] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const theme = useThemeStore((state) => state.theme);
    const { tasks } = useTaskStore();

    useEffect(() => {
        // Disabled for debugging
    }, []);

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const syncUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };
        syncUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        const interval = setInterval(() => {
            useChronosStore.getState().tick();
            if (Math.random() > 0.98) {
                useSystemLogStore.getState().addLog("SYSTEM_HEARTBEAT_ACKNOWLEDGED", "system");
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const cleanup = ArkanCommands.init(navigate);

        const handleGlobalInteraction = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.arkan-button') || target.closest('button') || target.closest('a') || target.closest('input')) {
                ArkanAudio.playClick();
            }
        };

        const handleHover = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.arkan-button') || target.closest('button') || target.closest('a')) {
                ArkanAudio.playHover();
            }
        };

        const handleGlobalTyping = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) return;
            ArkanAudio.typing(e);
        };

        window.addEventListener('click', handleGlobalInteraction);
        window.addEventListener('mouseover', handleHover);
        window.addEventListener('keydown', handleGlobalTyping);

        return () => {
            if (cleanup) cleanup();
            window.removeEventListener('click', handleGlobalInteraction);
            window.removeEventListener('mouseover', handleHover);
            window.removeEventListener('keydown', handleGlobalTyping);
        };
    }, [navigate]);

    const isPublicPage = ["/", "/login", "/signup"].includes(pathname);

    if (isPublicPage && pathname === "/") {
        return (
            <div className="min-h-screen bg-background text-foreground">
                {children}
            </div>
        );
    }

    if ((pathname === "/login" || pathname === "/signup")) {
        return <div className="min-h-screen bg-background text-foreground">{children}</div>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-deep-black text-white font-mono gap-[10px] p-[10px] relative">
            <div className="fixed inset-0 crt-overlay z-[1000] pointer-events-none opacity-40"></div>
            <div className="arkan-grid-overlay pointer-events-none" />

            {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}

            {showSplash && pathname === '/dashboard' && !showOnboarding && (
                <SplashSequence onComplete={() => setShowSplash(false)} />
            )}

            <div className="hidden lg:block w-[60px] shrink-0 border border-stable rounded-[4px] z-50 overflow-hidden">
                <Sidebar className="w-full h-full border-none bg-dark-panel backdrop-blur-xl" />
            </div>

            <div className="flex flex-1 overflow-hidden gap-[10px]">
                <div className="flex-1 flex flex-col min-w-0 bg-deep-black border border-stable rounded-[4px] relative overflow-hidden transition-all hover:border-primary">
                    <TacticalHeader />
                    <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a05] relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-1/4 w-px h-full bg-primary/5"></div>
                            <div className="absolute top-0 left-3/4 w-px h-full bg-primary/5"></div>
                            <div className="absolute top-1/2 left-0 w-full h-px bg-primary/5"></div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={pathname}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{
                                        duration: 0.3,
                                        ease: [0.2, 0, 0, 1]
                                    }}
                                    className={cn(
                                        "h-full w-full custom-scrollbar relative z-10 overflow-y-auto",
                                        !['/dashboard', '/operations', '/kanban', '/notes', '/timers', '/archive', '/expeditions', '/calendar'].includes(pathname) && "p-8"
                                    )}
                                >
                                    {children}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {pathname !== '/dashboard' && 
                         pathname !== '/operations' && 
                         pathname !== '/kanban' && 
                         pathname !== '/archive' && 
                         pathname !== '/expeditions' && 
                         pathname !== '/calendar' && 
                         pathname !== '/notes' && 
                         pathname !== '/timers' && 
                         <HardwareHUD />}
                        <OmniSearch />
                        <TacticalContextMenu />
                        <ModuleInitModal 
                            isOpen={isNewProjectModalOpen} 
                            onClose={() => setIsNewProjectModalOpen(false)} 
                        />
                    </main>
                </div>

                {!['/dashboard', '/operations', '/kanban', '/tasks', '/timers', '/expeditions'].includes(pathname) && (
                    <div className="relative flex h-full shrink-0">
                        <aside className={cn(
                            "hidden xl:flex flex-col border border-stable bg-dark-panel rounded-[4px] z-40 transition-all duration-300 ease-in-out hover:border-primary relative overflow-hidden",
                            inboxCollapsed ? "w-0 border-none opacity-0" : "w-[280px] opacity-100"
                        )}>
                            <GlobalInbox />
                        </aside>

                        {/* Toggle Button */}
                        <button 
                            onClick={() => {
                                setInboxCollapsed(!inboxCollapsed);
                                ArkanAudio.playFast('key_tick_mechanical');
                            }}
                            className={cn(
                                "hidden xl:flex absolute top-1/2 -translate-y-1/2 w-4 h-12 bg-dark-panel border border-stable flex items-center justify-center text-primary/40 hover:text-primary z-50 rounded-l-md transition-all duration-300 group",
                                inboxCollapsed ? "right-0" : "right-[280px]"
                            )}
                            title={inboxCollapsed ? "Expand Global Inbox" : "Collapse Global Inbox"}
                        >
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {inboxCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
