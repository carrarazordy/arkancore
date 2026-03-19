import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const isPublicPage = useMemo(() => PUBLIC_ROUTES.has(pathname), [pathname]);

    useEffect(() => {
        let isMounted = true;

        const syncAuth = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (!isMounted) return;

            if (error) {
                console.error("AuthGuard session lookup failed:", error.message);
            }

            setUser(data.session?.user ?? null);
            setLoading(false);
        };

        void syncAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (loading) return;

        if (!user && !isPublicPage) {
            navigate("/login", { replace: true, state: { from: pathname } });
            return;
        }

        if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
            navigate("/dashboard", { replace: true });
        }
    }, [isPublicPage, loading, navigate, pathname, user]);

    if (loading) {
        return <div className="min-h-screen bg-background text-primary flex items-center justify-center font-mono text-sm tracking-widest">INITIALIZING_SYSTEM...</div>;
    }

    if (!user && !isPublicPage) {
        return null;
    }

    return <>{children}</>;
}
