import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorker, updateWorker, workerWorkload } from "@/api/workerApi";

export const Route = createFileRoute("/_authenticated/admin/workers")({
  head: () => ({
    meta: [
      { title: "Field workers — GeoSmart admin" },
      { name: "description", content: "Manage sanitation crews, availability and workload distribution." },
      { property: "og:title", content: "Field workers — GeoSmart admin" },
      { property: "og:description", content: "Crew roster with assigned, open and resolved task counts." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <Workers />
    </RoleGate>
  ),
});

function Workers() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["workers", "workload"], queryFn: workerWorkload });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await createWorker({
        name: String(form.get("name")),
        email: String(form.get("email")),
        phone: String(form.get("phone")),
        employee_id: String(form.get("employee_id")),
        department: String(form.get("department") || "Sanitation"),
      });
      void queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Worker added");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add worker");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, availability: boolean) => {
    await updateWorker(id, { availability });
    void queryClient.invalidateQueries({ queryKey: ["workers"] });
  };

  return (
    <AppShell
      title="Field workers"
      subtitle={`${data.length} crew members`}
      actions={
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add worker
        </Button>
      }
    >
      {open ? (
        <form onSubmit={add} className="surface-card mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div><Label htmlFor="w-name">Name</Label><Input id="w-name" name="name" required /></div>
          <div><Label htmlFor="w-emp">Employee ID</Label><Input id="w-emp" name="employee_id" required /></div>
          <div><Label htmlFor="w-dept">Department</Label><Input id="w-dept" name="department" defaultValue="Sanitation" /></div>
          <div><Label htmlFor="w-email">Email</Label><Input id="w-email" name="email" type="email" /></div>
          <div><Label htmlFor="w-phone">Phone</Label><Input id="w-phone" name="phone" /></div>
          <div className="flex items-end"><Button type="submit" disabled={busy}>Save worker</Button></div>
        </form>
      ) : null}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Open</th>
                <th className="px-4 py-3">Resolved</th>
                <th className="px-4 py-3">Avg time</th>
                <th className="px-4 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {data.map((w) => (
                <tr key={w.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.employee_id}</p>
                  </td>
                  <td className="px-4 py-3">{w.department}</td>
                  <td className="px-4 py-3">{w.assigned}</td>
                  <td className="px-4 py-3">{w.open}</td>
                  <td className="px-4 py-3">{w.resolved}</td>
                  <td className="px-4 py-3">{w.avgResolutionHours}h</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={w.availability}
                      onChange={(e) => void toggle(w.id, e.target.checked)}
                      aria-label={`Toggle availability for ${w.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
