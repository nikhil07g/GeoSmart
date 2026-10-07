import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { ComplaintTable } from "@/components/geosmart/ComplaintTable";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { Input } from "@/components/ui/input";
import { listComplaints } from "@/api/complaintApi";
import { COMPLAINT_STATUSES } from "@/lib/geosmart/constants";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/citizen/complaints/")({
  head: () => ({
    meta: [
      { title: "My complaints — GeoSmart" },
      { name: "description", content: "Browse every waste complaint you have submitted and follow its status." },
      { property: "og:title", content: "My complaints — GeoSmart" },
      { property: "og:description", content: "All of your GeoSmart waste reports in one filterable list." },
    ],
  }),
  component: () => (
    <RoleGate allow="citizen">
      <MyComplaints />
    </RoleGate>
  ),
});

function MyComplaints() {
  const { user } = useAuth();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["complaints", "mine", user?.id, status, search],
    queryFn: () => listComplaints({ citizenId: user?.id, status, search }),
    enabled: Boolean(user?.id),
  });

  return (
    <AppShell title="My complaints" subtitle="Everything you've reported">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by title, code or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      {isLoading ? <LoadingSpinner /> : <ComplaintTable rows={data} basePath="/citizen/complaints" />}
    </AppShell>
  );
}
