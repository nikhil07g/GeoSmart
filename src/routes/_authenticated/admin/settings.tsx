import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { getAiServiceStatus } from "@/api/aiApi";
import { DUPLICATE_RADIUS_METERS } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GeoSmart admin" },
      {
        name: "description",
        content:
          "Platform configuration: AI service connection, severity model and duplicate detection rules.",
      },
      { property: "og:title", content: "Settings — GeoSmart admin" },
      { property: "og:description", content: "GeoSmart platform configuration overview." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <Settings />
    </RoleGate>
  ),
});

function Settings() {
  const { data } = useQuery({ queryKey: ["ai-status"], queryFn: getAiServiceStatus });

  return (
    <AppShell title="Settings" subtitle="Platform configuration">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">AI classification service</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Configured</dt>
              <dd>{data?.configured ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Reachable</dt>
              <dd>{data?.reachable ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Mode</dt>
              <dd>{data?.mode ?? "mock"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Point <code>AI_SERVICE_URL</code> at your deployed model endpoint exposing{" "}
            <code>/predict</code>,<code> /health</code> and <code>/retrain</code>.
          </p>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">Detection rules</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Duplicate radius</dt>
              <dd>{DUPLICATE_RADIUS_METERS} m</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Severity bands</dt>
              <dd>0–34 low · 35–59 medium · 60–79 high · 80+ critical</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Max route stops</dt>
              <dd>25</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Severity is recomputed server-side on every insert and update from category weight, AI
            confidence, nearby unresolved density and complaint age.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
