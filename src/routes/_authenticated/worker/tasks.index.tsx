import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { ComplaintTable } from "@/components/geosmart/ComplaintTable";
import { LoadingSpinner, EmptyState } from "@/components/geosmart/Feedback";
import { Input } from "@/components/ui/input";
import { listComplaints } from "@/api/complaintApi";
import { listWorkers } from "@/api/workerApi";
import { useAuth } from "@/lib/auth-context";
import { COMPLAINT_STATUSES } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/worker/tasks/")({
  head: () => ({
    meta: [
      { title: "My tasks — GeoSmart crew" },
      { name: "description", content: "Every pickup assigned to you, sorted by severity, with search and status filters." },
      { property: "og:title", content: "My tasks — GeoSmart crew" },
      { property: "og:description", content: "Assigned waste pickup queue for field crews." },
    ],
  }),
  component: () => (
    <RoleGate allow="worker">
      <Tasks />
    </RoleGate>
  ),
});

function Tasks() {
  const { user } = useAuth();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });
  const me = workers.find((w) => w.user_id === user?.id);

  const { data = [], isLoading } = useQuery({
    queryKey: ["complaints", "worker", me?.id, status, search],
    queryFn: () => listComplaints({ workerId: me?.id, status, search, sort: "severity" }),
    enabled: Boolean(me?.id),
  });

  return (
    <AppShell title="My tasks" subtitle={`${data.length} assignments`}>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState title="Nothing assigned" description="Admins assign complaints to you; they land here in real time." />
      ) : (
        <ComplaintTable rows={data} basePath="/worker/tasks" />
      )}
    </AppShell>
  );
}
