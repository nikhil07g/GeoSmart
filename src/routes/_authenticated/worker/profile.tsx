import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/api/authApi";
import { listWorkers, updateWorker } from "@/api/workerApi";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/worker/profile")({
  head: () => ({
    meta: [
      { title: "Crew profile — GeoSmart" },
      { name: "description", content: "Update your crew contact details and toggle your on-duty availability." },
      { property: "og:title", content: "Crew profile — GeoSmart" },
      { property: "og:description", content: "Field worker account and availability settings." },
    ],
  }),
  component: () => (
    <RoleGate allow="worker">
      <WorkerProfile />
    </RoleGate>
  ),
});

function WorkerProfile() {
  const { profile, user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: listWorkers });
  const me = workers.find((w) => w.user_id === user?.id);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const phone = String(form.get("phone"));
    setSaving(true);
    try {
      await updateProfile(user.id, { name, phone, address: String(form.get("address")) });
      if (me) await updateWorker(me.id, { name, phone });
      await refresh();
      void queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async () => {
    if (!me) return;
    await updateWorker(me.id, { availability: !me.availability });
    void queryClient.invalidateQueries({ queryKey: ["workers"] });
    toast.success(me.availability ? "You are now off duty" : "You are now available");
  };

  return (
    <AppShell title="Crew profile" subtitle={me ? `${me.employee_id} · ${me.department}` : "Field worker account"}>
      <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
        <form onSubmit={save} className="surface-card space-y-4 p-6">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" defaultValue={profile?.name ?? ""} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? user?.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={profile?.address ?? ""} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </form>

        <div className="surface-card h-fit space-y-3 p-6">
          <h2 className="text-sm font-semibold">Duty status</h2>
          <p className="text-sm text-muted-foreground">
            {me?.availability
              ? "You are available and can receive new assignments."
              : "You are off duty. Admins will route work to other crews."}
          </p>
          <Button variant={me?.availability ? "outline" : "default"} onClick={() => void toggleAvailability()}>
            {me?.availability ? "Go off duty" : "Go available"}
          </Button>
          {me?.current_lat != null ? (
            <p className="text-xs text-muted-foreground">
              Last known position: {me.current_lat.toFixed(4)}, {me.current_lng?.toFixed(4)}
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
