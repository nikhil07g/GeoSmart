import { api, uploadBody } from "@/api/api";
export interface HotspotDto {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
  complaintCount: number;
  complaint_count: number;
  severityScore: number;
  severity_score: number;
  radius: number;
}
export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  status: "active" | "pending" | "suspended";
  created_at: string;
}
export interface DatasetDto {
  id: string;
  name: string;
  description?: string;
  num_classes: number;
  num_images: number;
  status: string;
  created_at: string;
  last_trained_at?: string | null;
}
export async function listHotspots() {
  return api<HotspotDto[]>("/hotspots");
}
export async function listUsers() {
  return api<UserDto[]>("/users");
}
export async function createUser(payload: { name: string; email: string; password: string; role: string; phone?: string; address?: string }) {
  return api<UserDto>("/admin/users", { method: "POST", body: JSON.stringify(payload) });
}
export async function updateUser(id: string, patch: Record<string, unknown>) {
  return api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export async function deleteUser(id: string) {
  return api(`/admin/users/${id}`, { method: "DELETE" });
}
export async function listDatasets() {
  return api<DatasetDto[]>("/datasets");
}
export async function createDataset(payload: Record<string, unknown>) {
  return api("/datasets", {
    method: "POST",
    body: uploadBody(
      Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [
          k,
          v instanceof Blob ? v : v == null ? undefined : String(v),
        ]),
      ),
    ),
  });
}
