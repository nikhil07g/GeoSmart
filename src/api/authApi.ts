import { api, jsonBody, setToken } from "@/api/api";
import type { AppRole, Profile } from "@/lib/geosmart/types";
export interface AuthUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role?: AppRole;
  phone?: string;
  address?: string;
  status?: "active" | "pending" | "suspended";
}
export async function register(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role?: AppRole;
}) {
  const result = await api<{
    token: string | null;
    user: AuthUser;
    profile: Profile;
    role: AppRole;
    worker: null;
  }>("/auth/register", { method: "POST", body: jsonBody(input) });
  if (result.token) setToken(result.token);
  else setToken(null);
  return result;
}
export async function login(email: string, password: string, role: AppRole) {
  const result = await api<{
    token: string;
    user: AuthUser;
    profile: Profile;
    role: AppRole;
    worker: unknown;
  }>("/auth/login", { method: "POST", body: jsonBody({ email, password, role }) });
  setToken(result.token);
  return result;
}
export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}
export async function sendPasswordReset(_email: string) {
  throw new Error("Password reset is not configured. Contact your municipal administrator.");
}
export async function fetchMe(_userId?: string) {
  return api<{ user: AuthUser; profile: Profile; role: AppRole; worker: unknown }>("/auth/me");
}
export async function updateProfile(_userId: string, patch: Partial<Profile>) {
  const result = await api("/auth/me", { method: "PATCH", body: jsonBody(patch) });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("geosmart-auth-change"));
  return result;
}
