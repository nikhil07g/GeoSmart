import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "critical" | "success" | "info";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    warning: "text-warning-foreground",
    critical: "text-critical",
    success: "text-success",
    info: "text-info",
  };
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-2 text-2xl font-bold", tones[tone])}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-md bg-secondary p-2 text-secondary-foreground">{icon}</div> : null}
      </div>
    </div>
  );
}
