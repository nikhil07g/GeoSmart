import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsBundle {
  totals: Record<string, number>;
  byDay: Array<{ date: string; complaints: number; resolved: number }>;
  byCategory: Array<{ name: string; value: number }>;
  bySeverity: Array<{ name: string; value: number }>;
  byMonth: Array<{ month: string; complaints: number }>;
  avgResolutionHours: number;
  resolvedPercentage: number;
}

export async function fetchAnalytics(): Promise<AnalyticsBundle> {
  const { data, error } = await supabase
    .from("complaints")
    .select("status, severity, category, created_at, resolved_at");
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const totals = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "PENDING").length,
    assigned: rows.filter((r) => r.status === "ASSIGNED").length,
    inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
    resolved: rows.filter((r) => r.status === "RESOLVED").length,
    rejected: rows.filter((r) => r.status === "REJECTED").length,
    critical: rows.filter((r) => r.severity === "CRITICAL").length,
    today: rows.filter(
      (r) => new Date(r.created_at).toDateString() === new Date().toDateString(),
    ).length,
  };

  const days: Array<{ date: string; complaints: number; resolved: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key.slice(5),
      complaints: rows.filter((r) => r.created_at.slice(0, 10) === key).length,
      resolved: rows.filter((r) => r.resolved_at?.slice(0, 10) === key).length,
    });
  }

  const group = (field: "category" | "severity") => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r[field], (map.get(r[field]) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const monthMap = new Map<string, number>();
  rows.forEach((r) => {
    const m = r.created_at.slice(0, 7);
    monthMap.set(m, (monthMap.get(m) ?? 0) + 1);
  });
  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, complaints]) => ({ month, complaints }));

  const resolvedRows = rows.filter((r) => r.resolved_at);
  const avgResolutionHours = resolvedRows.length
    ? Math.round(
        (resolvedRows.reduce(
          (acc, r) => acc + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()),
          0,
        ) /
          resolvedRows.length /
          3_600_000) *
          10,
      ) / 10
    : 0;

  return {
    totals,
    byDay: days,
    byCategory: group("category"),
    bySeverity: group("severity"),
    byMonth,
    avgResolutionHours,
    resolvedPercentage: rows.length ? Math.round((totals.resolved / rows.length) * 100) : 0,
  };
}
