import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/lib/geosmart/types";

export async function register(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role: AppRole;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        name: input.name,
        phone: input.phone ?? "",
        address: input.address ?? "",
        role: input.role,
      },
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`,
  });
  if (error) throw new Error(error.message);
}

/** GET /api/auth/me equivalent. */
export async function fetchMe(userId: string) {
  const [{ data: profile }, { data: roles }, { data: worker }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("workers").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const roleList = (roles ?? []).map((r) => r.role as AppRole);
  const role: AppRole = roleList.includes("admin")
    ? "admin"
    : roleList.includes("worker")
      ? "worker"
      : "citizen";
  return { profile: profile ?? null, role, worker: worker ?? null };
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
