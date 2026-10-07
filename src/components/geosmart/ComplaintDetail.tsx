import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Calendar, User, Brain, Hash } from "lucide-react";
import { StatusBadge, SeverityBadge } from "./Badges";
import { ComplaintTimeline } from "./ComplaintTimeline";
import { LoadingSpinner } from "./Feedback";
import { MapView } from "@/components/map/MapView";
import { getComplaint, getComplaintHistory } from "@/api/complaintApi";

export function ComplaintDetail({ id, actions }: { id: string; actions?: ReactNode }) {
  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaints", id],
    queryFn: () => getComplaint(id),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["complaints", id, "history"],
    queryFn: () => getComplaintHistory(id),
  });

  if (isLoading) return <LoadingSpinner label="Loading complaint" />;
  if (!complaint) return <p className="text-sm text-muted-foreground">This complaint no longer exists.</p>;

  const worker = (complaint as { workers?: { name: string; employee_id: string; phone?: string | null } | null }).workers;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{complaint.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{complaint.complaint_code}</span>
                <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{complaint.citizen_name}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(complaint.created_at).toLocaleString()}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={complaint.status} />
              <SeverityBadge severity={complaint.severity} score={complaint.severity_score} />
            </div>
          </div>

          {complaint.description ? <p className="mt-4 text-sm text-muted-foreground">{complaint.description}</p> : null}

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Category:</span> {complaint.category}</p>
            <p className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {complaint.address ?? `${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`}
            </p>
            {complaint.ai_category ? (
              <p className="inline-flex items-center gap-1">
                <Brain className="h-3.5 w-3.5 text-primary" />
                AI: {complaint.ai_category} ({complaint.ai_confidence ?? 0}%)
              </p>
            ) : null}
            <p><span className="text-muted-foreground">Assigned to:</span> {worker ? `${worker.name} (${worker.employee_id})` : "Unassigned"}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {complaint.image_url ? (
              <figure>
                <img src={complaint.image_url} alt="Reported waste" loading="lazy" className="h-56 w-full rounded-lg object-cover" />
                <figcaption className="mt-1 text-xs text-muted-foreground">Reported photo</figcaption>
              </figure>
            ) : null}
            {complaint.extra_image_url ? (
              <figure>
                <img src={complaint.extra_image_url} alt="Additional angle of reported waste" loading="lazy" className="h-56 w-full rounded-lg object-cover" />
                <figcaption className="mt-1 text-xs text-muted-foreground">Additional angle</figcaption>
              </figure>
            ) : null}
            {complaint.resolution_image_url ? (
              <figure>
                <img src={complaint.resolution_image_url} alt="Cleared location after resolution" loading="lazy" className="h-56 w-full rounded-lg object-cover" />
                <figcaption className="mt-1 text-xs text-muted-foreground">Proof of cleanup</figcaption>
              </figure>
            ) : null}
          </div>

          {complaint.resolution_note ? (
            <p className="mt-4 rounded-md bg-success/10 p-3 text-sm text-success">{complaint.resolution_note}</p>
          ) : null}
        </div>

        <div className="surface-card p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h3>
          <ComplaintTimeline history={history} currentStatus={complaint.status} />
        </div>
      </div>

      <div className="space-y-6">
        <MapView
          className="h-64 w-full rounded-lg"
          center={[complaint.latitude, complaint.longitude]}
          zoom={16}
          markers={[{
            id: complaint.id,
            lat: complaint.latitude,
            lng: complaint.longitude,
            title: complaint.title,
            subtitle: complaint.address ?? undefined,
            severity: complaint.severity,
            status: complaint.status,
          }]}
        />
        {actions ? <div className="surface-card p-5">{actions}</div> : null}
      </div>
    </div>
  );
}
