import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { ComplaintTable } from "@/components/geosmart/ComplaintTable";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { Input } from "@/components/ui/input";
import { listComplaints } from "@/api/complaintApi";
import { listWorkers } from "@/api/workerApi";
import { COMPLAINT_STATUSES, SEVERITY_LEVELS, WASTE_CATEGORIES } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/admin/complaints/")({
  head: () => ({
    meta: [
      { title: "All complaints — GeoSmart admin" },
      { name: "description", content: "Filter, search and triage every waste complaint reported across the city." },
      { property: "og:title", content: "All complaints — GeoSmart admin" },
      { property: "og:description", content: "City-wide complaint queue with severity, status and crew filters." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminComplaints />
    </RoleGate>
  ),
});

const selectClass = "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

function AdminComplaints() {
  const [filters, setFilters] = useState({
    status: "all", severity: "all", category: "all", workerId: "all", search: "", sort: "newest" as const,
  });
  const { data = [], isLoading } = useQuery({
    queryKey: ["complaints", "admin", filters],
    queryFn: () => listComplaints(filters),
  });
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });

  const set = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <AppShell title="Complaints" subtitle={`${data.length} matching complaints`}>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input placeholder="Search complaints" value={filters.search} onChange={(e) => set("search", e.target.value)} className="max-w-xs" />
        <select className={selectClass} value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="all">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select className={selectClass} value={filters.severity} onChange={(e) => set("severity", e.target.value)}>
          <option value="all">All severities</option>
          {SEVERITY_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectClass} value={filters.category} onChange={(e) => set("category", e.target.value)}>
          <option value="all">All categories</option>
          {WASTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={filters.workerId} onChange={(e) => set("workerId", e.target.value)}>
          <option value="all">All workers</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className={selectClass} value={filters.sort} onChange={(e) => set("sort", e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="severity">Highest severity</option>
        </select>
      </div>
      {isLoading ? <LoadingSpinner /> : <ComplaintTable rows={data} basePath="/admin/complaints" />}
    </AppShell>
  );
}
