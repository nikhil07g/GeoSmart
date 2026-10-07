import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, CheckCircle2, AlertTriangle, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { DashboardCard } from "@/components/geosmart/DashboardCard";
import { ComplaintTable } from "@/components/geosmart/ComplaintTable";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { MapView } from "@/components/map/MapView";
import { Button } from "@/components/ui/button";
import { listComplaints } from "@/api/complaintApi";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_CENTER } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/citizen/dashboard")({
  head: () => ({
    meta: [
      { title: "My dashboard — GeoSmart" },
      { name: "description", content: "Track the waste complaints you reported and their resolution progress." },
      { property: "og:title", content: "My dashboard — GeoSmart" },
      { property: "og:description", content: "Your GeoSmart waste reports, statuses and map." },
    ],
  }),
  component: () => (
    <RoleGate allow="citizen">
      <CitizenDashboard />
    </RoleGate>
  ),
});

function CitizenDashboard() {
  const { user, profile } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["complaints", "mine", user?.id],
    queryFn: () => listComplaints({ citizenId: user?.id }),
    enabled: Boolean(user?.id),
  });

  const pending = data.filter((c) => c.status === "PENDING").length;
  const active = data.filter((c) => c.status === "ASSIGNED" || c.status === "IN_PROGRESS").length;
  const resolved = data.filter((c) => c.status === "RESOLVED").length;

  return (
    <AppShell
      title={`Hello, ${profile?.name ?? "citizen"}`}
      subtitle="Your reports and their progress"
      actions={
        <Button asChild size="sm">
          <Link to="/citizen/report">
            <PlusCircle className="mr-2 h-4 w-4" /> Report waste
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Total reports" value={data.length} icon={<FileText className="h-4 w-4" />} />
        <DashboardCard label="Pending" value={pending} tone="warning" icon={<Clock className="h-4 w-4" />} />
        <DashboardCard label="In progress" value={active} tone="info" icon={<AlertTriangle className="h-4 w-4" />} />
        <DashboardCard label="Resolved" value={resolved} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent reports</h2>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <ComplaintTable rows={data.slice(0, 8)} basePath="/citizen/complaints" />
          )}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your reports on the map</h2>
          <MapView
            className="h-[420px] w-full rounded-lg"
            center={data[0] ? [data[0].latitude, data[0].longitude] : DEFAULT_CENTER}
            zoom={data[0] ? 13 : 11}
            markers={data.map((c) => ({
              id: c.id,
              lat: c.latitude,
              lng: c.longitude,
              title: c.title,
              subtitle: c.address ?? undefined,
              severity: c.severity,
              status: c.status,
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
