import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { ComplaintDetail } from "@/components/geosmart/ComplaintDetail";

export const Route = createFileRoute("/_authenticated/citizen/complaints/$id")({
  head: () => ({
    meta: [
      { title: "Complaint details — GeoSmart" },
      { name: "description", content: "Follow the status, assigned crew and resolution proof for your waste complaint." },
      { property: "og:title", content: "Complaint details — GeoSmart" },
      { property: "og:description", content: "Status timeline and location for a GeoSmart waste complaint." },
    ],
  }),
  component: () => (
    <RoleGate allow="citizen">
      <CitizenComplaintDetail />
    </RoleGate>
  ),
});

function CitizenComplaintDetail() {
  const { id } = Route.useParams();
  return (
    <AppShell title="Complaint details" subtitle="Progress on your report">
      <ComplaintDetail id={id} />
    </AppShell>
  );
}
