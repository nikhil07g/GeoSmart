import { createFileRoute, Link } from "@tanstack/react-router";
import { Recycle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About GeoSmart — How AI Waste Intelligence Works" },
      { name: "description", content: "How GeoSmart classifies waste photos, scores severity, detects duplicates, maps hotspots and optimises municipal collection routes." },
      { property: "og:title", content: "About GeoSmart — How AI Waste Intelligence Works" },
      { property: "og:description", content: "The technology behind GeoSmart: deep-learning classification, severity scoring, GIS hotspots and route optimisation." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
        <h1 className="mt-6 flex items-center gap-3 text-4xl font-extrabold tracking-tight">
          <Recycle className="h-8 w-8 text-primary" /> About GeoSmart
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          GeoSmart is a smart waste management platform that connects citizens, municipal administrators
          and field crews around a single geospatial workflow.
        </p>

        <div className="mt-10 space-y-8">
          <section>
            <h2 className="text-xl font-semibold">AI classification</h2>
            <p className="mt-2 text-muted-foreground">
              Uploaded photos are sent to a deep-learning classification service that returns a waste class
              and a confidence score. The result is mapped onto GeoSmart's category taxonomy — plastic, organic,
              e-waste, construction debris, glass, paper, metal, mixed waste and illegal dumping. Citizens can
              always override the suggestion before submitting.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Severity scoring</h2>
            <p className="mt-2 text-muted-foreground">
              Every complaint receives a 0–100 severity score computed server-side from the waste category's
              hazard weight, AI confidence, the density of unresolved reports nearby, and how long the report has
              been open. Scores map to LOW, MEDIUM, HIGH and CRITICAL bands that drive triage order.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Duplicate detection</h2>
            <p className="mt-2 text-muted-foreground">
              Before a report is submitted, GeoSmart checks for open complaints of the same category within a
              short radius using haversine distance, so the same overflowing bin isn't queued five times.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">GIS mapping and hotspots</h2>
            <p className="mt-2 text-muted-foreground">
              Complaints are geotagged and rendered on interactive Leaflet maps with severity-coloured markers.
              Recurring clusters are surfaced as hotspots with an aggregated intensity, helping cities fix root
              causes instead of symptoms.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Route optimisation</h2>
            <p className="mt-2 text-muted-foreground">
              For a worker's assigned pickups, GeoSmart computes an efficient collection order — exhaustive A*
              search for small sets, nearest-neighbour construction with 2-opt improvement for larger ones — and
              draws the resulting path on the map.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Real-time collaboration</h2>
            <p className="mt-2 text-muted-foreground">
              Status changes, assignments and new reports propagate live to every dashboard, with in-app
              notifications for citizens, admins and workers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
