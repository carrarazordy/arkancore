import type { AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AppAuthUser {
  id: string;
  email: string | null;
}

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
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return mapAuthUser(data.session?.user);
}

export function subscribeToAuthUser(
  callback: (user: AppAuthUser | null, event: AuthChangeEvent) => void
) {
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
  const { error } = await supabase.auth.signOut({
    scope: scope === "all" ? "global" : "local",
  });

  if (error) {
    throw error;
  }
}
