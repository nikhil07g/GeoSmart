import { supabase } from "@/integrations/supabase/client";

export async function listWorkers() {
  const { data, error } = await supabase.from("workers").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createWorker(payload: {
  name: string;
  email?: string | undefined;
  phone?: string | undefined;
  employee_id: string;
  department: string;
}) {
  const { data, error } = await supabase.from("workers").insert(payload as never).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateWorker(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("workers").update(patch as never).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function workerWorkload() {
  const [{ data: workers }, { data: complaints }] = await Promise.all([
    supabase.from("workers").select("id, name, employee_id, department, availability"),
    supabase.from("complaints").select("assigned_worker_id, status, created_at, resolved_at"),
  ]);
  return (workers ?? []).map((w) => {
    const mine = (complaints ?? []).filter((c) => c.assigned_worker_id === w.id);
    const resolved = mine.filter((c) => c.status === "RESOLVED");
    const durations = resolved
      .filter((c) => c.resolved_at)
      .map((c) => new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime());
    const avgHours = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length / 3_600_000
      : 0;
    return {
      ...w,
      assigned: mine.length,
      resolved: resolved.length,
      open: mine.length - resolved.length,
      avgResolutionHours: Math.round(avgHours * 10) / 10,
    };
  });
}
