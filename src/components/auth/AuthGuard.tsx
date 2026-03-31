import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuthUser, subscribeToAuthUser, type AppAuthUser } from "@/lib/auth";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<AppAuthUser | null>(null);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const isPublicPage = useMemo(() => PUBLIC_ROUTES.has(pathname), [pathname]);

    useEffect(() => {
        let isMounted = true;

        const syncAuth = async () => {
            try {
                const nextUser = await getAuthUser();
                if (!isMounted) return;
                setUser(nextUser);
            } catch (error) {
                if (!isMounted) return;
                console.error("AuthGuard session lookup failed:", error instanceof Error ? error.message : error);
                setUser(null);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void syncAuth();

        const unsubscribe = subscribeToAuthUser((nextUser) => {
            if (!isMounted) return;
            setUser(nextUser);
            setLoading(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
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
