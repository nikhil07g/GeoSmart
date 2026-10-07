import { api } from "@/api/api";
export interface WorkerDto {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  employee_id: string;
  department: string;
  availability: boolean;
  current_lat?: number;
  current_lng?: number;
  assigned: number;
  open: number;
  resolved: number;
  avgResolutionHours: number;
}
export async function listWorkers() {
  return api<WorkerDto[]>("/workers");
}
export async function createWorker(payload: Record<string, unknown>) {
  return api("/workers", { method: "POST", body: JSON.stringify(payload) });
}
export async function updateWorker(id: string, patch: Record<string, unknown>) {
  const data = { ...patch };
  if (typeof data["availability"] === "boolean")
    data["availability"] = data["availability"] ? "AVAILABLE" : "OFFLINE";
  return api(`/workers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function workerWorkload() {
  return listWorkers();
}
