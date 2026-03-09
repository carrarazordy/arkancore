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
    LayoutGrid as FolderKanban
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "COMMAND_CENTER", href: "/dashboard", icon: LayoutDashboard },
    { name: "OPERATIONS", href: "/operations", icon: Terminal },
    { name: "KANBAN", href: "/kanban", icon: FolderKanban },
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

export function Sidebar({ className, style }: { className?: string; style?: React.CSSProperties }) {
    const { pathname } = useLocation();

    return (
        <aside
            style={style}
            className={cn(
                "flex h-full w-[60px] flex-col items-center py-6 bg-dark-panel transition-all z-50",
                className
            )}
        >
            <div className="mb-10">
                <div className="w-12 h-12 bg-primary flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(255,255,0,0.3)]">
                    <Terminal className="text-black font-bold h-6 w-6" />
                </div>
            </div>

            <nav className="flex flex-col gap-6 w-full px-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "group relative p-3 rounded-lg transition-all duration-200 flex justify-center",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-500 hover:bg-primary/10 hover:text-primary"
                            )}
                        >
                            <item.icon className="h-6 w-6" />
                            <span className="absolute left-14 bg-primary text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto flex flex-col gap-4 w-full px-2">
                {management.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "group relative p-3 rounded-lg transition-all duration-200 flex justify-center",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-500 hover:bg-primary/10 hover:text-primary"
                            )}
                        >
                            <item.icon className="h-6 w-6" />
                            <span className="absolute left-14 bg-primary text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}
