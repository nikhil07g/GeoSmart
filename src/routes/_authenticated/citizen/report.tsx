import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Loader2, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { ImageUploader } from "@/components/geosmart/ImageUploader";
import { LocationPicker } from "@/components/geosmart/LocationPicker";
import { SeverityBadge } from "@/components/geosmart/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { classifyWasteImage } from "@/api/aiApi";
import { createComplaint, findNearbyDuplicates } from "@/api/complaintApi";
import { WASTE_CATEGORIES } from "@/lib/geosmart/constants";
import { useAuth } from "@/lib/auth-context";
import type { AiClassification } from "@/lib/geosmart/types";

export const Route = createFileRoute("/_authenticated/citizen/report")({
  head: () => ({
    meta: [
      { title: "Report waste — GeoSmart" },
      {
        name: "description",
        content:
          "Upload a photo, confirm the location and let AI classify the waste before submitting your report.",
      },
      { property: "og:title", content: "Report waste — GeoSmart" },
      {
        property: "og:description",
        content: "Submit a geotagged, AI-classified waste complaint in under a minute.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="citizen">
      <ReportPage />
    </RoleGate>
  ),
});

interface Duplicate {
  id: string;
  complaint_code: string;
  title: string;
  distance: number;
}

function ReportPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<string>("Mixed Waste");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [ai, setAi] = useState<AiClassification | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);

  const runClassification = async (selected: File) => {
    setClassifying(true);
    try {
      const result = (await classifyWasteImage(selected)) as AiClassification;
      setAi(result);
      setCategory(result.category);
      if (!title) setTitle(`${result.category} reported`);
      toast.success(`AI detected ${result.category} (${result.confidence}% confidence)`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Classification failed — pick a category manually",
      );
    } finally {
      setClassifying(false);
    }
  };

  const onSelectImage = (next: File | null) => {
    setFile(next);
    setAi(null);
    if (next) void runClassification(next);
  };

  const onLocationChange = async (nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    try {
      const found = await findNearbyDuplicates(nextLat, nextLng);
      setDuplicates(found.slice(0, 3) as Duplicate[]);
    } catch {
      setDuplicates([]);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please add a photo of the waste.");
      return;
    }
    if (lat == null || lng == null) {
      toast.error("Please set the location.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please add a short title.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createComplaint({
        title: title.trim(),
        description: description.trim() || null,
        image: file,
        extraImage: extraFile,
        category,
        latitude: lat,
        longitude: lng,
        address: address.trim() || null,
      });
      toast.success(`Complaint ${created.complaint_code} submitted`);
      await navigate({ to: "/citizen/complaints/$id", params: { id: created.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Report waste" subtitle="Photo, location and AI classification">
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="surface-card space-y-4 p-5">
            <ImageUploader label="Waste photo (required)" file={file} onSelect={onSelectImage} />
            <ImageUploader
              label="Additional angle (optional)"
              file={extraFile}
              onSelect={setExtraFile}
            />

            {classifying ? (
              <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> AI is analysing your photo…
              </div>
            ) : null}

            {ai ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Brain className="h-4 w-4" /> AI classification
                </p>
                <p className="mt-1 text-sm">
                  {ai.category} · {ai.confidence}% confidence
                  {ai.rawClass ? (
                    <span className="text-muted-foreground"> · model class “{ai.rawClass}”</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can override the category below if the suggestion looks wrong.
                </p>
              </div>
            ) : null}
          </div>

          <div className="surface-card space-y-4 p-5">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Overflowing bin near market gate"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Waste category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {WASTE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What did you see? How long has it been there?"
              />
            </div>
            <div>
              <Label htmlFor="address">Landmark / address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Near Sector 12 bus stop"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card space-y-4 p-5">
            <h2 className="text-sm font-semibold">Location</h2>
            <LocationPicker lat={lat} lng={lng} onChange={onLocationChange} />
          </div>

          {duplicates.length > 0 ? (
            <div className="surface-card border-warning/40 bg-warning/5 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
                <AlertTriangle className="h-4 w-4" /> Possible duplicate reports nearby
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {duplicates.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3">
                    <span>
                      {d.title} <span className="text-muted-foreground">({d.complaint_code})</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(d.distance)} m away
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                You can still submit — your report will be linked to the existing one for the
                municipality.
              </p>
            </div>
          ) : null}

          <div className="surface-card flex items-center justify-between gap-4 p-5">
            <div className="text-sm text-muted-foreground">
              Severity is calculated automatically once submitted.
              <div className="mt-2">
                <SeverityBadge severity="MEDIUM" />
              </div>
            </div>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit report
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
