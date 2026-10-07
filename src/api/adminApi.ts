import { supabase } from "@/integrations/supabase/client";

export async function listHotspots() {
  const { data, error } = await supabase
    .from("hotspots")
    .select("*")
    .order("severity_score", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listUsers() {
  const [{ data: profiles, error }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw new Error(error.message);
  const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
  return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.user_id) ?? "citizen" }));
}

export async function listDatasets() {
  const { data, error } = await supabase
    .from("ai_datasets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDataset(payload: {
  name: string;
  description?: string | undefined;
  file_url?: string | null | undefined;
  file_type?: string | undefined;
  num_classes?: number | undefined;
  num_images?: number | undefined;
  uploaded_by?: string | undefined;
}) {
  const { data, error } = await supabase.from("ai_datasets").insert(payload as never).select().single();
  if (error) throw new Error(error.message);
  return data;
}
