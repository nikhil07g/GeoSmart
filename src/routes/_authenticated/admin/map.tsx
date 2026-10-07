import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { MapView } from "@/components/map/MapView";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { listComplaints } from "@/api/complaintApi";
import { listHotspots } from "@/api/adminApi";
import { listWorkers } from "@/api/workerApi";
import { COMPLAINT_STATUSES, SEVERITY_LEVELS, DEFAULT_CENTER } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/admin/map")({
  head: () => ({
    meta: [
      { title: "Live waste map — GeoSmart admin" },
      { name: "description", content: "Geospatial view of every open complaint, hotspot cluster and field crew position." },
      { property: "og:title", content: "Live waste map — GeoSmart admin" },
      { property: "og:description", content: "Interactive city map of waste complaints and hotspots." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminMap />
    </RoleGate>
  ),
});

function AdminMap() {
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [showHotspots, setShowHotspots] = useState(true);
  const [showWorkers, setShowWorkers] = useState(true);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints", "map", status, severity],
    queryFn: () => listComplaints({ status, severity }),
  });
  const { data: hotspots = [] } = useQuery({ queryKey: ["hotspots"], queryFn: listHotspots });
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });

  const markers = [
    ...complaints.map((c) => ({
      id: c.id, lat: c.latitude, lng: c.longitude, title: c.title,
      subtitle: c.address ?? undefined, severity: c.severity, status: c.status,
    })),
    ...(showWorkers
      ? workers
          .filter((w) => w.current_lat != null && w.current_lng != null)
          .map((w) => ({
            id: `worker-${w.id}`, lat: w.current_lat!, lng: w.current_lng!,
            title: w.name, subtitle: `${w.department} · ${w.employee_id}`, badge: "worker",
          }))
      : []),
  ];

  return (
    <AppShell title="Live map" subtitle={`${complaints.length} complaints plotted`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="all">All severities</option>
          {SEVERITY_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} /> Hotspots
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showWorkers} onChange={(e) => setShowWorkers(e.target.checked)} /> Crew positions
        </label>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading map data" />
      ) : (
        <MapView
          className="h-[calc(100vh-260px)] min-h-[420px] w-full rounded-lg"
          center={complaints[0] ? [complaints[0].latitude, complaints[0].longitude] : DEFAULT_CENTER}
          zoom={12}
          markers={markers}
          circles={showHotspots ? hotspots.map((h) => ({
            id: h.id, lat: h.latitude, lng: h.longitude, radius: h.radius,
            intensity: h.severity_score, label: h.name ?? undefined,
          })) : []}
        />
      )}
    </AppShell>
  );
}
