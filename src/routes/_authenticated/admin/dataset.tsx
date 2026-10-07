import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Database, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { EmptyState, LoadingSpinner } from "@/components/geosmart/Feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDataset, listDatasets } from "@/api/adminApi";
import { getAiServiceStatus, requestRetraining } from "@/api/aiApi";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/dataset")({
  head: () => ({
    meta: [
      { title: "AI dataset — GeoSmart admin" },
      {
        name: "description",
        content:
          "Register waste image datasets and trigger retraining of the classification model.",
      },
      { property: "og:title", content: "AI dataset — GeoSmart admin" },
      { property: "og:description", content: "Dataset registry and model retraining controls." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <DatasetPage />
    </RoleGate>
  ),
});

function DatasetPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ["datasets"], queryFn: listDatasets });
  const { data: status } = useQuery({ queryKey: ["ai-status"], queryFn: getAiServiceStatus });
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await createDataset({
        name: String(form.get("name")),
        description: String(form.get("description") ?? ""),
        file_url: String(form.get("file_url") ?? "") || null,
        file_type: String(form.get("file_type") ?? "zip"),
        file:
          form.get("dataset_file") instanceof File && (form.get("dataset_file") as File).size
            ? form.get("dataset_file")
            : undefined,
        num_classes: Number(form.get("num_classes") ?? 0),
        num_images: Number(form.get("num_images") ?? 0),
        uploaded_by: user?.id,
      });
      void queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("Dataset registered");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register dataset");
    } finally {
      setBusy(false);
    }
  };

  const startTraining = async (id: string) => {
    setBusy(true);
    try {
      const res = (await requestRetraining({ datasetId: id })) as {
        status: string;
        dispatched: boolean;
      };
      void queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast.success(
        res.dispatched ? "Retraining dispatched to the AI service" : "Retraining queued locally",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start training");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="AI dataset" subtitle="Training data and model lifecycle">
      <div className="surface-card mb-6 flex flex-wrap items-center gap-3 p-4 text-sm">
        <Brain className="h-4 w-4 text-primary" />
        <span>
          Classification service:{" "}
          <strong>
            {status?.configured
              ? status.reachable
                ? "connected"
                : "configured but unreachable"
              : "not configured"}
          </strong>
        </span>
        <span className="text-muted-foreground">
          Set the <code>AI_SERVICE_URL</code> secret to point at your deployed model; GeoSmart falls
          back to a deterministic mock classifier otherwise.
        </span>
      </div>

      <form
        onSubmit={add}
        className="surface-card mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <Label htmlFor="d-name">Dataset name</Label>
          <Input id="d-name" name="name" required />
        </div>
        <div>
          <Label htmlFor="d-url">Dataset URL</Label>
          <Input id="d-url" name="file_url" placeholder="https://…/waste-dataset.zip" />
        </div>
        <div>
          <Label htmlFor="d-type">File type</Label>
          <Input id="d-type" name="file_type" defaultValue="zip" />
        </div>
        <div>
          <Label htmlFor="d-file">Dataset file</Label>
          <Input
            id="d-file"
            name="dataset_file"
            type="file"
            accept=".zip,.csv,image/jpeg,image/png,image/webp"
          />
        </div>
        <div>
          <Label htmlFor="d-classes">Classes</Label>
          <Input id="d-classes" name="num_classes" type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="d-images">Images</Label>
          <Input id="d-images" name="num_images" type="number" min={0} defaultValue={0} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label htmlFor="d-desc">Description</Label>
          <Textarea id="d-desc" name="description" rows={2} />
        </div>
        <div>
          <Button type="submit" disabled={busy}>
            Register dataset
          </Button>
        </div>
      </form>

      {isLoading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState
          title="No datasets registered"
          description="Register a labelled waste image dataset to enable retraining."
          icon={<Database className="h-5 w-5" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((d) => (
            <div key={d.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.num_classes} classes · {d.num_images} images
                  </p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                  {d.status.replace("_", " ")}
                </span>
              </div>
              {d.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{d.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Last trained:{" "}
                {d.last_trained_at ? new Date(d.last_trained_at).toLocaleString() : "never"}
              </p>
              <Button
                className="mt-3 w-full"
                variant="secondary"
                disabled={busy}
                onClick={() => void startTraining(d.id)}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Start retraining
              </Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
