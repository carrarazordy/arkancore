import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    useEffect(() => {
        console.log("AuthGuard: Checking auth...");
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            console.log("AuthGuard: Session retrieved", session);
            setUser(session?.user ?? null);
            setLoading(false);
        };
        checkAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            if (event === 'SIGNED_OUT') {
                navigate('/login');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [navigate]);

    const isPublicPage = ["/", "/login", "/signup"].includes(pathname);

    if (loading) {
        return <div className="min-h-screen bg-background text-primary flex items-center justify-center font-mono text-sm tracking-widest">INITIALIZING_SYSTEM...</div>;
    }

    if (!user && !isPublicPage) {
        // Redirect to login if trying to access a private page without auth
        // Use setTimeout to avoid state updates during render
        setTimeout(() => navigate('/login'), 0);
        return null;
    }

    return <>{children}</>;
}
