import { api } from "@/api/api";
export interface RouteRequest {
  workerId?: string | undefined;
  startLocation: { latitude: number; longitude: number };
  complaintIds: string[];
}
export async function optimizeRoute(input: RouteRequest) {
  if (!input.complaintIds.length) throw new Error("Select at least one complaint");
  return api("/routes/optimize", { method: "POST", body: JSON.stringify(input) });
}
