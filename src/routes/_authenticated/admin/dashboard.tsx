import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Clock, CheckCircle2, Flame, Timer, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { DashboardCard } from "@/components/geosmart/DashboardCard";
import { ComplaintTable } from "@/components/geosmart/ComplaintTable";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { MapView } from "@/components/map/MapView";
import { Button } from "@/components/ui/button";
import { fetchAnalytics } from "@/api/analyticsApi";
import { listComplaints } from "@/api/complaintApi";
import { listHotspots } from "@/api/adminApi";
import { DEFAULT_CENTER } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Municipal dashboard — GeoSmart" },
      { name: "description", content: "Live overview of waste complaints, severity mix, hotspots and resolution performance." },
      { property: "og:title", content: "Municipal dashboard — GeoSmart" },
      { property: "og:description", content: "Operational command centre for city waste management teams." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminDashboard />
    </RoleGate>
  ),
});

const PIE_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: fetchAnalytics });
  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints", "admin", "recent"],
    queryFn: () => listComplaints({ sort: "severity" }),
  });
  const { data: hotspots = [] } = useQuery({ queryKey: ["hotspots"], queryFn: listHotspots });

  if (isLoading || !analytics) {
    return (
      <AppShell title="Municipal dashboard">
        <LoadingSpinner label="Crunching city data" />
      </AppShell>
    );
  }

  const t = analytics.totals;

  return (
    <AppShell
      title="Municipal dashboard"
      subtitle="Live city-wide waste operations"
      actions={
        <Button asChild size="sm" variant="secondary">
          <Link to="/admin/routes">Plan routes</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <DashboardCard label="Total" value={t['total'] ?? 0} icon={<FileText className="h-4 w-4" />} />
        <DashboardCard label="Pending" value={t['pending'] ?? 0} tone="warning" icon={<Clock className="h-4 w-4" />} />
        <DashboardCard label="In progress" value={(t['assigned'] ?? 0) + (t['inProgress'] ?? 0)} tone="info" />
        <DashboardCard label="Resolved" value={t['resolved'] ?? 0} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
        <DashboardCard label="Critical" value={t['critical'] ?? 0} tone="critical" icon={<Flame className="h-4 w-4" />} />
        <DashboardCard
          label="Avg resolution"
          value={`${analytics.avgResolutionHours}h`}
          hint={`${analytics.resolvedPercentage}% resolved`}
          icon={<Timer className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Reports vs resolutions (14 days)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics.byDay}>
              <defs>
                <linearGradient id="gReported" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="complaints" stroke="var(--color-chart-1)" fill="url(#gReported)" name="Reported" />
              <Area type="monotone" dataKey="resolved" stroke="var(--color-chart-2)" fill="url(#gResolved)" name="Resolved" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Severity mix</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={analytics.bySeverity} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {analytics.bySeverity.map((entry, i) => (
                  <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Top waste categories</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.byCategory.slice(0, 6)} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live complaint map</h2>
          <MapView
            className="h-[320px] w-full rounded-lg"
            center={complaints[0] ? [complaints[0].latitude, complaints[0].longitude] : DEFAULT_CENTER}
            zoom={12}
            markers={complaints.map((c) => ({
              id: c.id, lat: c.latitude, lng: c.longitude, title: c.title,
              subtitle: c.address ?? undefined, severity: c.severity, status: c.status,
            }))}
            circles={hotspots.map((h) => ({
              id: h.id, lat: h.latitude, lng: h.longitude, radius: h.radius,
              intensity: h.severity_score, label: h.name ?? undefined,
            }))}
          />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Highest priority complaints</h2>
        <ComplaintTable rows={complaints.slice(0, 10)} basePath="/admin/complaints" />
      </div>
    </AppShell>
  );
}
