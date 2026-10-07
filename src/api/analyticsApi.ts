import { api } from "@/api/api";
export interface AnalyticsBundle {
  totals: Record<string, number>;
  byDay: Array<{ date: string; complaints: number; resolved: number }>;
  byCategory: Array<{ name: string; value: number }>;
  bySeverity: Array<{ name: string; value: number }>;
  byMonth: Array<{ month: string; complaints: number }>;
  avgResolutionHours: number;
  resolvedPercentage: number;
}
export async function fetchAnalytics() {
  return api<AnalyticsBundle>("/analytics/overview");
}
