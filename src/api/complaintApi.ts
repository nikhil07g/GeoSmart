import { supabase } from "@/integrations/supabase/client";
import { haversineMeters, DUPLICATE_RADIUS_METERS } from "@/lib/geosmart/constants";
import type { Complaint } from "@/lib/geosmart/types";
import type { ComplaintStatus } from "@/lib/geosmart/constants";

export interface ComplaintFilters {
  status?: string | undefined;
  severity?: string | undefined;
  category?: string | undefined;
  workerId?: string | undefined;
  search?: string | undefined;
  citizenId?: string | undefined;
  sort?: "newest" | "oldest" | "severity" | undefined;
}

export async function listComplaints(filters: ComplaintFilters = {}) {
  let query = supabase.from("complaints").select("*, workers(id,name,employee_id)");

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status as ComplaintStatus);
  if (filters.severity && filters.severity !== "all") query = query.eq("severity", filters.severity as never);
  if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.workerId && filters.workerId !== "all") query = query.eq("assigned_worker_id", filters.workerId);
  if (filters.citizenId) query = query.eq("citizen_id", filters.citizenId);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${term},complaint_code.ilike.${term},address.ilike.${term},citizen_name.ilike.${term},category.ilike.${term}`,
    );
  }

  if (filters.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (filters.sort === "severity") query = query.order("severity_score", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getComplaint(id: string) {
  const { data, error } = await supabase
    .from("complaints")
    .select("*, workers(id,name,employee_id,department,phone)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getComplaintHistory(id: string) {
  const { data, error } = await supabase
    .from("complaint_history")
    .select("*")
    .eq("complaint_id", id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Finds unresolved complaints within the configured radius. */
export async function findNearbyDuplicates(lat: number, lng: number) {
  const delta = 0.01;
  const { data, error } = await supabase
    .from("complaints")
    .select("id, complaint_code, title, latitude, longitude, status, category, created_at")
    .neq("status", "RESOLVED")
    .gte("latitude", lat - delta)
    .lte("latitude", lat + delta)
    .gte("longitude", lng - delta)
    .lte("longitude", lng + delta);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((c) => ({ ...c, distance: haversineMeters({ lat, lng }, { lat: c.latitude, lng: c.longitude }) }))
    .filter((c) => c.distance <= DUPLICATE_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance);
}

export async function createComplaint(payload: Partial<Complaint>) {
  const { data, error } = await supabase.from("complaints").insert(payload as never).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus, comment?: string) {
  const { error } = await supabase.from("complaints").update({ status } as never).eq("id", id);
  if (error) throw new Error(error.message);
  if (comment) {
    await supabase.from("complaint_history").insert({ complaint_id: id, status, comment } as never);
  }
}

export async function assignComplaint(id: string, workerId: string) {
  const { error } = await supabase
    .from("complaints")
    .update({ assigned_worker_id: workerId, status: "ASSIGNED" } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateComplaint(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("complaints").update(patch as never).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function submitResolution(
  id: string,
  input: { resolution_image_url?: string | null; resolution_note?: string },
) {
  const { error } = await supabase
    .from("complaints")
    .update({ ...input, status: "RESOLVED", resolved_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteComplaint(id: string) {
  const { error } = await supabase.from("complaints").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
