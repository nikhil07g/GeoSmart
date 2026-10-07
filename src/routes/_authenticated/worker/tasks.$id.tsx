import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Navigation, CheckCircle2, Play } from "lucide-react";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { ComplaintDetail } from "@/components/geosmart/ComplaintDetail";
import { ImageUploader } from "@/components/geosmart/ImageUploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getComplaint, submitResolution, updateComplaintStatus } from "@/api/complaintApi";
import { uploadImage } from "@/api/uploadApi";

export const Route = createFileRoute("/_authenticated/worker/tasks/$id")({
  head: () => ({
    meta: [
      { title: "Task details — GeoSmart crew" },
      { name: "description", content: "Navigate to the site, start the job and upload proof-of-cleanup to close the task." },
      { property: "og:title", content: "Task details — GeoSmart crew" },
      { property: "og:description", content: "Field task resolution with photo proof." },
    ],
  }),
  component: () => (
    <RoleGate allow="worker">
      <TaskDetail />
    </RoleGate>
  ),
});

function TaskDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const start = async () => {
    setBusy(true);
    try {
      await updateComplaintStatus(id, "IN_PROGRESS", "Crew started work on site");
      invalidate();
      toast.success("Marked in progress");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const navigateToSite = async () => {
    const complaint = await getComplaint(id);
    if (!complaint) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${complaint.latitude},${complaint.longitude}`,
      "_blank",
      "noopener",
    );
  };

  const resolve = async () => {
    if (!file) {
      toast.error("Upload a photo of the cleaned site");
      return;
    }
    setBusy(true);
    try {
      const upload = await uploadImage(file, "resolutions");
      await submitResolution(id, { resolution_image_url: upload.path, resolution_note: note });
      invalidate();
      toast.success("Task resolved. Thank you!");
      void navigate({ to: "/worker/tasks" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit resolution");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Task details" subtitle="Complete the pickup and log proof">
      <ComplaintDetail
        id={id}
        actions={
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void navigateToSite()}>
                <Navigation className="mr-2 h-4 w-4" /> Navigate
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void start()}>
                <Play className="mr-2 h-4 w-4" /> Start work
              </Button>
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <ImageUploader label="Proof of cleanup" file={file} onSelect={setFile} />
              <div>
                <Label htmlFor="res-note">Resolution note</Label>
                <Textarea
                  id="res-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What was collected and how it was disposed of…"
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={() => void resolve()}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark resolved
              </Button>
            </div>
          </div>
        }
      />
    </AppShell>
  );
}
