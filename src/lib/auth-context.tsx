import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, login as apiLogin, logout as apiLogout, register as apiRegister, type AuthUser } from "@/api/authApi";
import { getToken } from "@/api/api";
import type { AppRole, Profile, Worker } from "@/lib/geosmart/types";
interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  worker: Worker | null;
  role: AppRole | null;
  loading: boolean;
  token: string | null;
  isAuthenticated: boolean;
  login: typeof apiLogin;
  register: typeof apiRegister;
  logout: typeof apiLogout;
  refreshUser: () => Promise<void>;
  refresh: () => Promise<void>;
}
const AuthContext = createContext<AuthState | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!getToken()) {
      setUser(null);
      setProfile(null);
      setWorker(null);
      setRole(null);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me.user);
      setProfile(me.profile);
      setRole(me.role);
      setWorker(me.worker as Worker | null);
    } catch {
      setUser(null);
      setProfile(null);
      setWorker(null);
      setRole(null);
    }
  };
  useEffect(() => {
    let alive = true;
    const update = () => {
      void load().finally(() => {
        if (alive) setLoading(false);
      });
    };
    update();
    window.addEventListener("geosmart-auth-change", update);
    return () => {
      alive = false;
      window.removeEventListener("geosmart-auth-change", update);
    };
  }, []);
  const value = useMemo(
    () => ({ user, profile, worker, role, loading, token: getToken(), isAuthenticated: Boolean(getToken() && user), login: apiLogin, register: apiRegister, logout: apiLogout, refresh: load, refreshUser: load }),
    [user, profile, worker, role, loading],
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
