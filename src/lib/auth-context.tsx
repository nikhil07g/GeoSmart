import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchMe } from "@/api/authApi";
import type { AppRole, Profile, Worker } from "@/lib/geosmart/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  worker: Worker | null;
  role: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (userId: string) => {
    const me = await fetchMe(userId);
    setProfile(me.profile);
    setRole(me.role);
    setWorker(me.worker);
  };

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setRole(null);
        setWorker(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        setTimeout(() => {
          void load(nextSession.user.id);
        }, 0);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await load(data.session.user.id);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      worker,
      role,
      loading,
      refresh: async () => {
        if (session?.user) await load(session.user.id);
      },
    }),
    [session, profile, worker, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function homeForRole(role: AppRole | null) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "worker") return "/worker/dashboard";
  return "/citizen/dashboard";
}
