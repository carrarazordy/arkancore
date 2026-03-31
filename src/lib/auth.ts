import type { AuthChangeEvent } from "@supabase/supabase-js";
import { isAuthBypassed, supabase } from "@/lib/supabase";

export interface AppAuthUser {
  id: string;
  email: string | null;
}

const bypassAuthUser: AppAuthUser = {
  id: import.meta.env.VITE_BYPASS_AUTH_USER_ID?.trim() || "arkan-local-test-user",
  email: import.meta.env.VITE_BYPASS_AUTH_EMAIL?.trim() || "test@arkancore.local",
};

function mapAuthUser(user: { id: string; email?: string | null } | null | undefined): AppAuthUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export async function getAuthUser() {
  if (isAuthBypassed) {
    return bypassAuthUser;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return mapAuthUser(data.session?.user);
}

export function subscribeToAuthUser(
  callback: (user: AppAuthUser | null, event: AuthChangeEvent | "BYPASS") => void
) {
  if (isAuthBypassed) {
    callback(bypassAuthUser, "BYPASS");
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(mapAuthUser(session?.user), event);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function terminateAuthSession(scope: "current" | "all" = "current") {
  if (isAuthBypassed) {
    return;
  }

  const { error } = await supabase.auth.signOut({
    scope: scope === "all" ? "global" : "local",
  });

  if (error) {
    throw error;
  }
}

export { isAuthBypassed };
