import { api, jsonBody, uploadBody } from "@/api/api";
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
export interface ComplaintHistoryDto {
  id: string;
  status: ComplaintStatus;
  complaint_id: string;
  changed_by: string | null;
  changed_by_name: string | null;
  comment: string | null;
  created_at: string;
}
export interface NearbyComplaintDto {
  id: string;
  complaint_code: string;
  title: string;
  distance: number;
}
export async function listComplaints(filters: ComplaintFilters = {}) {
  const q = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][],
  );
  return api<Complaint[]>(`/complaints${q.size ? `?${q}` : ""}`);
}
export async function getComplaint(id: string) {
  return api<Complaint>(`/complaints/${id}`);
}
export async function getComplaintHistory(id: string) {
  return api<ComplaintHistoryDto[]>(`/complaints/${id}/history`);
}
export async function findNearbyDuplicates(lat: number, lng: number) {
  return api<NearbyComplaintDto[]>(`/complaints/nearby?latitude=${lat}&longitude=${lng}`);
}
export async function createComplaint(payload: Record<string, unknown>) {
  const body = uploadBody(
    Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [
        k,
        v instanceof Blob ? v : typeof v === "string" ? v : v == null ? undefined : String(v),
      ]),
    ),
  );
  return api<Complaint>("/complaints", { method: "POST", body });
}
export async function updateComplaintStatus(id: string, status: ComplaintStatus, comment?: string) {
  return api(`/complaints/${id}/status`, { method: "PATCH", body: jsonBody({ status, comment }) });
}
export async function assignComplaint(id: string, workerId: string) {
  return api(`/complaints/${id}/assign`, { method: "PATCH", body: jsonBody({ workerId }) });
}
export async function updateComplaint(id: string, patch: Record<string, unknown>) {
  return api(`/complaints/${id}`, { method: "PATCH", body: jsonBody(patch) });
}
export async function submitResolution(
  id: string,
  input: { resolution_image_url?: string | null; resolution_note?: string },
) {
  return api(`/complaints/${id}/resolution`, {
    method: "POST",
    body: jsonBody({
      comment: input.resolution_note,
      resolution_image_url: input.resolution_image_url,
    }),
  });
}
export async function deleteComplaint(id: string) {
  return api(`/complaints/${id}`, { method: "DELETE" });
}
