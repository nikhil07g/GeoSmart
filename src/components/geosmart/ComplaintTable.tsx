import { Link } from "@tanstack/react-router";
import { StatusBadge, SeverityBadge } from "./Badges";
import { EmptyState } from "./Feedback";
import type { Complaint } from "@/lib/geosmart/types";

type Row = Complaint & { workers?: { name: string } | null };

export function ComplaintTable({ rows, basePath }: { rows: Row[]; basePath: "/admin/complaints" | "/citizen/complaints" | "/worker/tasks" }) {
  if (rows.length === 0) {
    return <EmptyState title="No complaints found" description="Try adjusting your filters or search." />;
  }
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Complaint</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Worker</th>
            <th className="px-4 py-3">Reported</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link to={`${basePath}/$id`} params={{ id: c.id }} className="font-semibold text-primary hover:underline">
                  {c.title}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {c.complaint_code} · {c.address ?? "Unknown location"}
                </div>
              </td>
              <td className="px-4 py-3">{c.category}</td>
              <td className="px-4 py-3">
                <SeverityBadge severity={c.severity} score={c.severity_score} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.workers?.name ?? "Unassigned"}</td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
