import { cn } from "@/lib/utils";
import type { ComplaintStatus, SeverityLevel } from "@/lib/geosmart/constants";

const statusStyles: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning-foreground border-warning/40",
  ASSIGNED: "bg-info/15 text-info border-info/40",
  IN_PROGRESS: "bg-primary/15 text-primary border-primary/40",
  RESOLVED: "bg-success/15 text-success border-success/40",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/40",
};

const severityStyles: Record<string, string> = {
  LOW: "bg-success/15 text-success border-success/40",
  MEDIUM: "bg-info/15 text-info border-info/40",
  HIGH: "bg-warning/20 text-warning-foreground border-warning/50",
  CRITICAL: "bg-critical/15 text-critical border-critical/50",
};

const base =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide";

export function StatusBadge({ status, className }: { status: ComplaintStatus | string; className?: string }) {
  return (
    <span className={cn(base, statusStyles[status] ?? statusStyles['PENDING'], className)}>
      {String(status).replace("_", " ")}
    </span>
  );
}

export function SeverityBadge({
  severity,
  score,
  className,
}: {
  severity: SeverityLevel | string;
  score?: number;
  className?: string;
}) {
  return (
    <span className={cn(base, severityStyles[severity] ?? severityStyles['MEDIUM'], className)}>
      {severity}
      {typeof score === "number" ? <span className="opacity-70">· {score}</span> : null}
    </span>
  );
}
