import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Route as RouteIcon, Navigation } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { MapView } from "@/components/map/MapView";
import { EmptyState } from "@/components/geosmart/Feedback";
import { Button } from "@/components/ui/button";
import { listComplaints } from "@/api/complaintApi";
import { listWorkers, updateWorker } from "@/api/workerApi";
import { optimizeRoute } from "@/api/routeApi";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_CENTER } from "@/lib/geosmart/constants";
import type { OptimizedRoute } from "@/lib/geosmart/types";

export const Route = createFileRoute("/_authenticated/worker/routes")({
  head: () => ({
    meta: [
      { title: "Collection route — GeoSmart crew" },
      { name: "description", content: "An optimised pickup sequence from your live location across all assigned stops." },
      { property: "og:title", content: "Collection route — GeoSmart crew" },
      { property: "og:description", content: "Turn-by-turn optimised waste collection route." },
    ],
  }),
  component: () => (
    <RoleGate allow="worker">
      <WorkerRoute />
    </RoleGate>
  ),
});

function WorkerRoute() {
  const { user } = useAuth();
  const optimize = useServerFn(optimizeRoute);
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });
  const me = workers.find((w) => w.user_id === user?.id);

  const { data: tasks = [] } = useQuery({
    queryKey: ["complaints", "worker", me?.id, "route"],
    queryFn: () => listComplaints({ workerId: me?.id, sort: "severity" }),
    enabled: Boolean(me?.id),
  });
  const open = tasks.filter((t) => t.status !== "RESOLVED" && t.status !== "REJECTED");

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<OptimizedRoute | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation || !me?.id) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(next);
        void updateWorker(me.id, { current_lat: next[0], current_lng: next[1] });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [me?.id]);

  const run = async () => {
    if (open.length === 0) {
      toast.error("No open tasks to route");
      return;
    }
    setBusy(true);
    try {
      const start = position
        ? { latitude: position[0], longitude: position[1] }
        : { latitude: me?.current_lat ?? DEFAULT_CENTER[0], longitude: me?.current_lng ?? DEFAULT_CENTER[1] };
      const res = (await optimize({
        data: { workerId: me?.id, startLocation: start, complaintIds: open.map((c) => c.id) },
      })) as OptimizedRoute;
      setResult(res);
      toast.success(`Route ready · ${(res.distanceMeters / 1000).toFixed(1)} km`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build route");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Collection route"
      subtitle={position ? "Live location tracking on" : "Enable location for accurate routing"}
      actions={
        <Button size="sm" onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RouteIcon className="mr-2 h-4 w-4" />}
          Optimise route
        </Button>
      }
    >
      {open.length === 0 ? (
        <EmptyState title="No stops to plan" description="Once tasks are assigned to you, build an optimised route here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MapView
              className="h-[520px] w-full rounded-lg"
              center={position ?? (open[0] ? [open[0].latitude, open[0].longitude] : DEFAULT_CENTER)}
              zoom={13}
              polyline={result?.coordinates}
              markers={(result?.ordered ?? []).length > 0
                ? result!.ordered.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, title: s.title, order: s.order }))
                : open.map((c) => ({
                    id: c.id, lat: c.latitude, lng: c.longitude, title: c.title,
                    subtitle: c.address ?? undefined, severity: c.severity, status: c.status,
                  }))}
            />
          </div>
          <div className="surface-card p-4">
            {result ? (
              <>
                <p className="text-sm">
                  <strong>{(result.distanceMeters / 1000).toFixed(2)} km</strong> · ~{result.durationMinutes} min
                </p>
                <p className="text-xs text-muted-foreground">Algorithm: {result.algorithm}</p>
                <ol className="mt-3 space-y-2 text-sm">
                  {result.ordered.map((s) => (
                    <li key={s.id} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {s.order}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{s.title}</span>
                        <a
                          className="text-xs text-primary hover:underline"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="mr-1 inline h-3 w-3" />Navigate
                        </a>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {open.length} open stops. Tap “Optimise route” to compute the shortest sequence from your current position.
              </p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
