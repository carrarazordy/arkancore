import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    StickyNote,
    Timer,
    Shield,
    Settings,
    ShoppingCart,
    Terminal,
    Calendar,
    Archive,
    Rocket,
    Search as SearchIcon,
    LayoutGrid as FolderKanban
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "COMMAND_CENTER", href: "/dashboard", icon: LayoutDashboard },
    { name: "SYSTEM_QUERY", href: "/search", icon: SearchIcon },
    { name: "OPERATIONS", href: "/operations", icon: Terminal },
    { name: "TASK_ARCHIVE", href: "/tasks", icon: FolderKanban },
    { name: "EXPEDITION_PLANNER", href: "/expeditions", icon: Rocket },
    { name: "NEURAL_ARCHIVE", href: "/notes", icon: StickyNote },
    { name: "CHRONOS", href: "/timers", icon: Timer },
    { name: "TEMPORAL_SCHEDULER", href: "/calendar", icon: Calendar },
    { name: "HISTORICAL_ARCHIVE", href: "/archive", icon: Archive },
    { name: "LOGISTICS", href: "/shopping", icon: ShoppingCart },
];

const management = [
    { name: "IDENTITY_SECURITY", href: "/security", icon: Shield },
    { name: "SYSTEM_SETTINGS", href: "/settings", icon: Settings },
];

interface SidebarProps {
    className?: string;
    style?: React.CSSProperties;
    variant?: "compact" | "expanded";
    onNavigate?: () => void;
}

export function Sidebar({ className, style, variant = "compact", onNavigate }: SidebarProps) {
    const { pathname } = useLocation();
    const isExpanded = variant === "expanded";

    return (
        <aside
            style={style}
            className={cn(
                "flex h-full flex-col bg-dark-panel transition-all z-50",
                isExpanded ? "w-[280px] items-stretch p-4" : "w-[60px] items-center py-6",
                className
            )}
        >
            <div className={cn("flex items-center", isExpanded ? "mb-8 gap-3 px-2" : "mb-10 justify-center")}>
                <div className="w-12 h-12 shrink-0 bg-primary flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(255,255,0,0.3)]">
                    <Terminal className="text-black font-bold h-6 w-6" />
                </div>
                {isExpanded && (
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">ARKAN OS</div>
                        <div className="text-[9px] text-primary/40 uppercase tracking-[0.2em]">Navigation Matrix</div>
                    </div>
                )}
            </div>

            <nav className={cn("flex flex-col w-full", isExpanded ? "gap-2" : "gap-6 px-2") }>
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={onNavigate}
                            className={cn(
                                "group relative rounded-lg transition-all duration-200",
                                isExpanded ? "flex items-center gap-3 px-3 py-3" : "flex justify-center p-3",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-500 hover:bg-primary/10 hover:text-primary"
                            )}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {isExpanded ? (
                                <span className="text-[11px] font-bold tracking-[0.18em] uppercase">{item.name}</span>
                            ) : (
                                <span className="absolute left-14 bg-primary text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                    {item.name}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={cn("mt-auto flex flex-col w-full", isExpanded ? "gap-2 pt-6 border-t border-primary/10" : "gap-4 px-2") }>
                {management.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={onNavigate}
                            className={cn(
                                "group relative rounded-lg transition-all duration-200",
                                isExpanded ? "flex items-center gap-3 px-3 py-3" : "flex justify-center p-3",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-500 hover:bg-primary/10 hover:text-primary"
                            )}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {isExpanded ? (
                                <span className="text-[11px] font-bold tracking-[0.18em] uppercase">{item.name}</span>
                            ) : (
                                <span className="absolute left-14 bg-primary text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                    {item.name}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}






