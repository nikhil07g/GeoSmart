import { LIFECYCLE } from "@/lib/geosmart/constants";
import type { ComplaintHistoryRow } from "@/lib/geosmart/types";
import { CheckCircle2, Circle } from "lucide-react";

export function ComplaintTimeline({
  history,
  currentStatus,
}: {
  history: ComplaintHistoryRow[];
  currentStatus: string;
}) {
  const reached = new Set(history.map((h) => h.status));
  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2">
        {LIFECYCLE.map((step, i) => {
          const done = reached.has(step) || LIFECYCLE.indexOf(currentStatus as never) >= i;
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  done ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                {step.replace("_", " ")}
              </span>
              {i < LIFECYCLE.length - 1 ? <span className="h-px w-4 bg-border" /> : null}
            </li>
          );
        })}
      </ol>

      <ul className="space-y-4 border-l border-border pl-5">
        {history.map((h) => (
          <li key={h.id} className="relative">
            <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <p className="text-sm font-semibold">{h.status.replace("_", " ")}</p>
            {h.comment ? <p className="text-sm text-muted-foreground">{h.comment}</p> : null}
            <p className="text-xs text-muted-foreground">
              {new Date(h.created_at).toLocaleString()}
              {h.changed_by_name ? ` · ${h.changed_by_name}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
