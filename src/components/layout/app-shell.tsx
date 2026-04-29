import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { GlobalInbox } from "./GlobalInbox";
import { TacticalHeader } from "./TacticalHeader";
import { HardwareHUD } from "./HardwareHUD";
import { OmniSearch } from "./OmniSearch";
import TacticalContextMenu from "./TacticalContextMenu";
import { cn } from "@/lib/utils";
import { THEME_SWATCHES, useThemeStore } from "@/store/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthUser, subscribeToAuthUser, type AppAuthUser } from "@/lib/auth";
import { SplashSequence } from "./SplashSequence";
import { ModuleInitModal } from "../ui/ModuleInitModal";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

import { useChronosStore } from "@/store/useChronosStore";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { ArkanCommands } from "@/lib/commands";

import { useUIStore } from "@/store/useUIStore";
import { hasCompletedOnboarding } from "@/lib/onboarding";

const CONTENT_ROUTES = ["/dashboard", "/operations", "/kanban", "/notes", "/timers", "/search", "/archive", "/expeditions", "/shopping", "/calendar", "/settings"];
const INBOX_HIDDEN_ROUTES = ["/dashboard", "/operations", "/kanban", "/tasks", "/timers", "/search", "/expeditions", "/shopping", "/calendar", "/settings"];

function hexToRgb(hex: string) {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map((char) => `${char}${char}`).join('')
        : normalized;
    const parsed = Number.parseInt(value, 16);

    return {
        r: (parsed >> 16) & 255,
        g: (parsed >> 8) & 255,
        b: parsed & 255,
    };
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const { isNewProjectModalOpen, setIsNewProjectModalOpen } = useUIStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [inboxCollapsed, setInboxCollapsed] = useState(false);
    const [showSplash, setShowSplash] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [currentUser, setCurrentUser] = useState<AppAuthUser | null>(null);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const theme = useThemeStore((state) => state.theme);

    useEffect(() => {
        // Disabled for debugging
    }, []);

    useEffect(() => {
        let isMounted = true;

        const syncUser = async () => {
            try {
                const user = await getAuthUser();
                if (!isMounted) return;
                setCurrentUser(user);
            } catch (error) {
                if (!isMounted) return;
                console.error("App shell user sync failed:", error);
                setCurrentUser(null);
            }
        };
        void syncUser();

        const unsubscribe = subscribeToAuthUser((user) => {
            if (!isMounted) return;
            setCurrentUser(user);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const primary = THEME_SWATCHES[theme] ?? THEME_SWATCHES.yellow;
        const rgb = hexToRgb(primary);

        root.setAttribute('data-theme', theme);
        root.style.setProperty('--color-primary', primary);
        root.style.setProperty('--color-stable', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
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

        return () => {
            if (cleanup) cleanup();
        };
    }, [navigate]);

    const isPublicPage = ["/", "/login", "/signup"].includes(pathname);
    const showPagePadding = !CONTENT_ROUTES.includes(pathname);
    const showHardwareHud = showPagePadding;
    const showDesktopInbox = !INBOX_HIDDEN_ROUTES.includes(pathname);

    useEffect(() => {
        if (isPublicPage || !currentUser) {
            setShowOnboarding(false);
            return;
        }

        setShowOnboarding(!hasCompletedOnboarding(currentUser.id));
    }, [currentUser, isPublicPage, pathname]);

    if (isPublicPage && pathname === "/") {
        return (
            <div className="min-h-screen bg-background text-foreground">
                {children}
            </div>
        );
    }

    if (pathname === "/login" || pathname === "/signup") {
        return <div className="min-h-screen bg-background text-foreground">{children}</div>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-deep-black text-white font-mono gap-[10px] p-[10px] relative">
            <div className="fixed inset-0 crt-overlay z-[1000] pointer-events-none opacity-40"></div>
            <div className="arkan-grid-overlay pointer-events-none" />

            {showOnboarding && currentUser && (
                <OnboardingFlow
                    userId={currentUser.id}
                    userEmail={currentUser.email}
                    onComplete={() => setShowOnboarding(false)}
                />
            )}

            {showSplash && pathname === '/dashboard' && !showOnboarding && (
                <SplashSequence onComplete={() => setShowSplash(false)} />
            )}

            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1100] lg:hidden"
                    >
                        <button
                            type="button"
                            aria-label="Close navigation menu"
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                        <motion.div
                            initial={{ x: -320 }}
                            animate={{ x: 0 }}
                            exit={{ x: -320 }}
                            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                            className="absolute inset-y-0 left-0 w-[280px] border-r border-primary/20 bg-dark-panel shadow-[0_0_30px_rgba(0,0,0,0.45)]"
                        >
                            <div className="flex items-center justify-between border-b border-primary/10 px-4 py-4">
                                <div>
                                    <div className="text-[10px] font-bold tracking-[0.24em] uppercase text-primary">Navigation</div>
                                    <div className="text-[9px] uppercase tracking-[0.18em] text-primary/40">Mobile Access Layer</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="flex h-9 w-9 items-center justify-center rounded-sm border border-primary/20 bg-primary/5 text-primary/70 transition-colors hover:border-primary/50 hover:text-primary"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <Sidebar variant="expanded" className="h-full w-full border-none bg-transparent" onNavigate={() => setIsSidebarOpen(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="hidden lg:block w-[60px] shrink-0 border border-stable rounded-[4px] z-50 overflow-hidden">
                <Sidebar className="w-full h-full border-none bg-dark-panel backdrop-blur-xl" />
            </div>

            <div className="flex flex-1 min-w-0 overflow-hidden gap-[10px]">
                <div className="flex-1 flex flex-col min-w-0 bg-deep-black border border-stable rounded-[4px] relative overflow-hidden transition-all hover:border-primary">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden absolute left-3 top-3 z-[70] flex h-10 w-10 items-center justify-center rounded-sm border border-primary/20 bg-black/80 text-primary/70 backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-primary"
                        aria-label="Open navigation menu"
                    >
                        <Menu size={18} />
                    </button>

                    <TacticalHeader />
                    <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0a0a05] relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-1/4 w-px h-full bg-primary/5"></div>
                            <div className="absolute top-0 left-3/4 w-px h-full bg-primary/5"></div>
                            <div className="absolute top-1/2 left-0 w-full h-px bg-primary/5"></div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-hidden relative">
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
                                        showPagePadding && "p-8"
                                    )}
                                >
                                    {children}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {showHardwareHud && <HardwareHUD />}
                        <OmniSearch />
                        <TacticalContextMenu />
                        <ModuleInitModal
                            isOpen={isNewProjectModalOpen}
                            onClose={() => setIsNewProjectModalOpen(false)}
                        />
                    </main>
                </div>

                {showDesktopInbox && (
                    <div className="relative flex h-full shrink-0">
                        <aside className={cn(
                            "hidden xl:flex flex-col border border-stable bg-dark-panel rounded-[4px] z-40 transition-all duration-300 ease-in-out hover:border-primary relative overflow-hidden",
                            inboxCollapsed ? "w-0 border-none opacity-0" : "w-[280px] opacity-100"
                        )}>
                            <GlobalInbox />
                        </aside>

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





