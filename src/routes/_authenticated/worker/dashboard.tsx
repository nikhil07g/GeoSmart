import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, CheckCircle2, Timer, MapPin } from "lucide-react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { DashboardCard } from "@/components/geosmart/DashboardCard";
import { LoadingSpinner, EmptyState } from "@/components/geosmart/Feedback";
import { ComplaintTable } from "@/components/geosmart/ComplaintTable";
import { MapView } from "@/components/map/MapView";
import { listComplaints } from "@/api/complaintApi";
import { listWorkers } from "@/api/workerApi";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_CENTER } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/worker/dashboard")({
  head: () => ({
    meta: [
      { title: "Crew dashboard — GeoSmart" },
      { name: "description", content: "Your assigned waste pickups, progress and daily performance in one field view." },
      { property: "og:title", content: "Crew dashboard — GeoSmart" },
      { property: "og:description", content: "Field crew task overview for municipal waste collection." },
    ],
  }),
  component: () => (
    <RoleGate allow="worker">
      <WorkerDashboard />
    </RoleGate>
  ),
});

function WorkerDashboard() {
  const { user } = useAuth();
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });
  const me = workers.find((w) => w.user_id === user?.id);
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["complaints", "worker", me?.id],
    queryFn: () => listComplaints({ workerId: me?.id, sort: "severity" }),
    enabled: Boolean(me?.id),
  });

  const open = tasks.filter((t) => t.status !== "RESOLVED" && t.status !== "REJECTED");
  const resolved = tasks.filter((t) => t.status === "RESOLVED");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");

  return (
    <AppShell title={`Hi ${me?.name ?? "there"}`} subtitle="Today's collection workload">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Open tasks" value={open.length} icon={<ClipboardList className="h-4 w-4" />} tone="warning" />
        <DashboardCard label="In progress" value={inProgress.length} icon={<Timer className="h-4 w-4" />} tone="info" />
        <DashboardCard label="Resolved" value={resolved.length} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <DashboardCard label="Availability" value={me?.availability ? "Available" : "Off duty"} icon={<MapPin className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-2">
          {isLoading ? (
            <LoadingSpinner />
          ) : open.length === 0 ? (
            <EmptyState title="No open tasks" description="You're all caught up. New assignments appear here instantly." />
          ) : (
            <ComplaintTable rows={open.slice(0, 8)} basePath="/worker/tasks" />
          )}
        </div>
        <MapView
          className="h-[420px] w-full rounded-lg"
          center={open[0] ? [open[0].latitude, open[0].longitude] : DEFAULT_CENTER}
          zoom={12}
          markers={open.map((c) => ({
            id: c.id, lat: c.latitude, lng: c.longitude, title: c.title,
            subtitle: c.address ?? undefined, severity: c.severity, status: c.status,
          }))}
        />
      </div>
    </AppShell>
  );
}
