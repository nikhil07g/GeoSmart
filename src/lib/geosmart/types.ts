import type { Tables } from "@/integrations/supabase/types";

export type Complaint = Tables<"complaints">;
export type ComplaintHistoryRow = Tables<"complaint_history">;
export type Worker = Tables<"workers">;
export type Hotspot = Tables<"hotspots">;
export type NotificationRow = Tables<"notifications">;
export type Profile = Tables<"profiles">;
export type AiDataset = Tables<"ai_datasets">;

export type AppRole = "citizen" | "admin" | "worker";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface AiClassification {
  category: string;
  confidence: number;
  severity: string;
  rawClass: string;
  source: "ai-service" | "unavailable";
  available?: boolean;
}

export interface OptimizedRoute {
  ordered: Array<{ id: string; title: string; lat: number; lng: number; order: number }>;
  coordinates: Array<[number, number]>;
  distanceMeters: number;
  durationMinutes: number;
  algorithm: string;
}
