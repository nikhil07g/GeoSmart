import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { ComplaintDetail } from "@/components/geosmart/ComplaintDetail";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { assignComplaint, updateComplaint, updateComplaintStatus } from "@/api/complaintApi";
import { listWorkers } from "@/api/workerApi";
import { COMPLAINT_STATUSES } from "@/lib/geosmart/constants";

export const Route = createFileRoute("/_authenticated/admin/complaints/$id")({
  head: () => ({
    meta: [
      { title: "Complaint triage — GeoSmart admin" },
      { name: "description", content: "Assign a crew, change status and record notes for a reported waste complaint." },
      { property: "og:title", content: "Complaint triage — GeoSmart admin" },
      { property: "og:description", content: "Full complaint record with assignment and status controls." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminComplaintDetail />
    </RoleGate>
  ),
});

function AdminComplaintDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });
  const [worker, setWorker] = useState("");
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const doAssign = async () => {
    if (!worker) { toast.error("Choose a worker first"); return; }
    setBusy(true);
    try {
      await assignComplaint(id, worker);
      invalidate();
      toast.success("Worker assigned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  };

  const doStatus = async () => {
    if (!status) { toast.error("Choose a status"); return; }
    setBusy(true);
    try {
      await updateComplaintStatus(id, status as never, note || undefined);
      invalidate();
      toast.success("Status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    setBusy(true);
    try {
      await updateComplaint(id, { admin_notes: note });
      invalidate();
      toast.success("Internal note saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Complaint triage" subtitle="Assign, update and annotate">
      <ComplaintDetail
        id={id}
        actions={
          <div className="space-y-4">
            <div>
              <Label htmlFor="assign">Assign worker</Label>
              <select
                id="assign"
                value={worker}
                onChange={(e) => setWorker(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Select a worker…</option>
                {workers.filter((w) => w.availability).map((w) => (
                  <option key={w.id} value={w.id}>{w.name} · {w.department}</option>
                ))}
              </select>
              <Button className="mt-2 w-full" onClick={doAssign} disabled={busy}>Assign</Button>
            </div>

            <div>
              <Label htmlFor="status">Change status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Select status…</option>
                {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <Button className="mt-2 w-full" variant="secondary" onClick={doStatus} disabled={busy}>Update status</Button>
            </div>

            <div>
              <Label htmlFor="note">Internal note</Label>
              <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Context for the crew or record keeping" />
              <Button className="mt-2 w-full" variant="outline" onClick={saveNote} disabled={busy}>Save note</Button>
            </div>
          </div>
        }
      />
    </AppShell>
  );
}
