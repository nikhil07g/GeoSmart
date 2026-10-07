import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/api/authApi";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/citizen/profile")({
  head: () => ({
    meta: [
      { title: "My profile — GeoSmart" },
      { name: "description", content: "Update your GeoSmart contact details and address." },
      { property: "og:title", content: "My profile — GeoSmart" },
      { property: "og:description", content: "Manage your GeoSmart citizen account details." },
    ],
  }),
  component: () => (
    <RoleGate allow="citizen">
      <ProfilePage />
    </RoleGate>
  ),
});

function ProfilePage() {
  const { profile, user, refresh } = useAuth();
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await updateProfile(user.id, {
        name: String(form.get("name")),
        phone: String(form.get("phone")),
        address: String(form.get("address")),
      });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="My profile" subtitle="Contact details used on your reports">
      <form onSubmit={save} className="surface-card max-w-lg space-y-4 p-6">
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
    </AppShell>
  );
}
