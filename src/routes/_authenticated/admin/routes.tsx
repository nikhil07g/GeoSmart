import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Route as RouteIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { MapView } from "@/components/map/MapView";
import { EmptyState } from "@/components/geosmart/Feedback";
import { SeverityBadge } from "@/components/geosmart/Badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { listComplaints } from "@/api/complaintApi";
import { listWorkers } from "@/api/workerApi";
import { optimizeRoute } from "@/api/routeApi";
import { DEFAULT_CENTER } from "@/lib/geosmart/constants";
import type { OptimizedRoute } from "@/lib/geosmart/types";

export const Route = createFileRoute("/_authenticated/admin/routes")({
  head: () => ({
    meta: [
      { title: "Route planner — GeoSmart admin" },
      {
        name: "description",
        content:
          "Build the shortest collection route across selected complaints with A* and 2-opt optimisation.",
      },
      { property: "og:title", content: "Route planner — GeoSmart admin" },
      { property: "og:description", content: "Optimised municipal waste collection routing." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <RoutePlanner />
    </RoleGate>
  ),
});

function RoutePlanner() {
  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints", "routing"],
    queryFn: () => listComplaints({ sort: "severity" }),
  });
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });

  const [selected, setSelected] = useState<string[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [result, setResult] = useState<OptimizedRoute | null>(null);
  const [busy, setBusy] = useState(false);

  const open = complaints.filter((c) => c.status !== "RESOLVED" && c.status !== "REJECTED");

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 25 ? s : [...s, id],
    );

  const run = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one complaint");
      return;
    }
    const worker = workers.find((w) => w.id === workerId);
    const start = {
      latitude: worker?.current_lat ?? DEFAULT_CENTER[0],
      longitude: worker?.current_lng ?? DEFAULT_CENTER[1],
    };
    setBusy(true);
    try {
      const res = (await optimizeRoute({
        workerId: workerId || undefined,
        startLocation: start,
        complaintIds: selected,
      })) as OptimizedRoute;
      setResult(res);
      toast.success(`Route optimised with ${res.algorithm}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Optimisation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Route planner" subtitle="Pick stops, generate the shortest run">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="surface-card p-5">
            <Label htmlFor="crew">Start from crew location</Label>
            <select
              id="crew"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">City depot (default)</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button className="mt-3 w-full" onClick={run} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RouteIcon className="mr-2 h-4 w-4" />
              )}
              Optimise {selected.length} stops
            </Button>
            {result ? (
              <div className="mt-4 rounded-md bg-muted p-3 text-sm">
                <p>
                  <strong>{(result.distanceMeters / 1000).toFixed(2)} km</strong> · ~
                  {result.durationMinutes} min
                </p>
                <p className="text-xs text-muted-foreground">Algorithm: {result.algorithm}</p>
              </div>
            ) : null}
          </div>

          <div className="surface-card max-h-[420px] overflow-y-auto p-2">
            {open.length === 0 ? (
              <EmptyState
                title="No open complaints"
                description="Everything is resolved — nothing to route."
              />
            ) : (
              open.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md p-3 hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.address ?? c.complaint_code}
                    </span>
                    <SeverityBadge
                      className="mt-1"
                      severity={c.severity}
                      score={c.severity_score}
                    />
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <MapView
            className="h-[560px] w-full rounded-lg"
            center={result?.coordinates[0] ?? DEFAULT_CENTER}
            zoom={12}
            polyline={result?.coordinates}
            markers={(
              result?.ordered ??
              open
                .filter((c) => selected.includes(c.id))
                .map((c) => ({
                  id: c.id,
                  lat: c.latitude,
                  lng: c.longitude,
                  title: c.title,
                  order: undefined,
                }))
            ).map((s) => ({
              id: s.id,
              lat: s.lat,
              lng: s.lng,
              title: s.title,
              order: (s as { order?: number }).order,
            }))}
          />
          {result ? (
            <ol className="surface-card mt-4 divide-y divide-border p-0 text-sm">
              {result.ordered.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {s.order}
                  </span>
                  {s.title}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
