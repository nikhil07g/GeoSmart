import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { DashboardCard } from "@/components/geosmart/DashboardCard";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { fetchAnalytics } from "@/api/analyticsApi";
import { workerWorkload } from "@/api/workerApi";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — GeoSmart admin" },
      { name: "description", content: "Resolution times, category trends, severity distribution and crew performance analytics." },
      { property: "og:title", content: "Analytics — GeoSmart admin" },
      { property: "og:description", content: "Waste operations analytics for municipal decision making." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <Analytics />
    </RoleGate>
  ),
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: fetchAnalytics });
  const { data: workers = [] } = useQuery({ queryKey: ["workers", "workload"], queryFn: workerWorkload });

  if (isLoading || !data) {
    return <AppShell title="Analytics"><LoadingSpinner /></AppShell>;
  }

  return (
    <AppShell title="Analytics" subtitle="Performance and trends">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Resolution rate" value={`${data.resolvedPercentage}%`} tone="success" />
        <DashboardCard label="Avg resolution time" value={`${data.avgResolutionHours}h`} tone="info" />
        <DashboardCard label="Critical open" value={data.totals['critical'] ?? 0} tone="critical" />
        <DashboardCard label="Reported today" value={data.totals['today'] ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Daily volume (14 days)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="complaints" stroke="var(--color-chart-1)" strokeWidth={2} name="Reported" />
              <Line type="monotone" dataKey="resolved" stroke="var(--color-chart-2)" strokeWidth={2} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Monthly reports</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="complaints" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Category distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.byCategory} dataKey="value" nameKey="name" outerRadius={110} label>
                {data.byCategory.map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Crew performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workers.map((w) => ({ name: w.name, resolved: w.resolved, open: w.open }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip /><Legend />
              <Bar dataKey="resolved" stackId="a" fill="var(--color-chart-2)" name="Resolved" />
              <Bar dataKey="open" stackId="a" fill="var(--color-chart-4)" name="Open" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  );
}
