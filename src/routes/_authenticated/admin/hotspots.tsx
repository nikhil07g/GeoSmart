import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { MapView } from "@/components/map/MapView";
import { EmptyState, LoadingSpinner } from "@/components/geosmart/Feedback";
import { listHotspots } from "@/api/adminApi";
import { DEFAULT_CENTER } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/admin/hotspots")({
  head: () => ({
    meta: [
      { title: "Waste hotspots — GeoSmart admin" },
      { name: "description", content: "Recurring dumping clusters ranked by intensity so cities can fix root causes." },
      { property: "og:title", content: "Waste hotspots — GeoSmart admin" },
      { property: "og:description", content: "Ranked hotspot clusters with map intensity overlays." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <Hotspots />
    </RoleGate>
  ),
});

function Hotspots() {
  const { data = [], isLoading } = useQuery({ queryKey: ["hotspots"], queryFn: listHotspots });

  return (
    <AppShell title="Hotspots" subtitle="Recurring problem areas across the city">
      {isLoading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState title="No hotspots detected yet" description="Hotspots appear once repeated complaints cluster in the same area." icon={<Flame className="h-5 w-5" />} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MapView
              className="h-[480px] w-full rounded-lg"
              center={data[0] ? [data[0].latitude, data[0].longitude] : DEFAULT_CENTER}
              zoom={12}
              circles={data.map((h) => ({
                id: h.id, lat: h.latitude, lng: h.longitude, radius: h.radius,
                intensity: h.severity_score, label: h.name ?? undefined,
              }))}
            />
          </div>
          <ul className="space-y-3">
            {data.map((h) => (
              <li key={h.id} className="surface-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{h.name ?? "Unnamed cluster"}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-critical/10 px-2 py-0.5 text-xs font-bold text-critical">
                    <Flame className="h-3 w-3" /> {h.severity_score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {h.complaint_count} complaints · {h.radius} m radius
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
