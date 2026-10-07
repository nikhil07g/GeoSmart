import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { createUser, deleteUser, listUsers, updateUser } from "@/api/adminApi";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — GeoSmart admin" },
      {
        name: "description",
        content: "Directory of citizens, field workers and administrators on the platform.",
      },
      { property: "og:title", content: "Users — GeoSmart admin" },
      { property: "og:description", content: "Platform user directory with assigned roles." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <Users />
    </RoleGate>
  ),
});

function Users() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const change = async (id: string, patch: Record<string, unknown>) => {
    try {
      await updateUser(id, patch);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update user");
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this account? Its complaint history will be retained.")) return;
    try {
      await deleteUser(id);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Account deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
    }
  };
  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createUser({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        role: String(form.get("role")),
        phone: String(form.get("phone") ?? ""),
        address: String(form.get("address") ?? ""),
      });
      formElement.reset();
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create user");
    }
  };
  const shown = data.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (statusFilter === "all" ||
        (u.status ?? (u.active ? "active" : "suspended")) === statusFilter),
  );

  return (
    <AppShell title="Users" subtitle={`${data.length} accounts`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All roles</option>
          <option value="citizen">Citizens</option>
          <option value="worker">Workers</option>
          <option value="admin">Admins</option>
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => setShowCreate((v) => !v)}
        >
          Create user
        </button>
      </div>
      {showCreate ? (
        <form
          onSubmit={add}
          className="surface-card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            name="name"
            required
            placeholder="Full name"
            className="rounded-md border border-input bg-background px-3 py-2"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-md border border-input bg-background px-3 py-2"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Temporary password"
            className="rounded-md border border-input bg-background px-3 py-2"
          />
          <input
            name="phone"
            placeholder="Phone"
            className="rounded-md border border-input bg-background px-3 py-2"
          />
          <input
            name="address"
            placeholder="Address"
            className="rounded-md border border-input bg-background px-3 py-2"
          />
          <select name="role" className="rounded-md border border-input bg-background px-3 py-2">
            <option value="citizen">Citizen</option>
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:col-span-2 lg:col-span-3">
            Create account
          </button>
        </form>
      ) : null}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {u.status ?? (u.active ? "active" : "suspended")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      onChange={(e) => void change(u.id, { role: e.target.value })}
                      className="rounded border border-input bg-background px-2 py-1"
                    >
                      <option value="citizen">Citizen</option>
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                    {u.role === "worker" && u.status === "pending" ? (
                      <>
                        <button
                          className="ml-2 text-primary underline"
                          onClick={() => void change(u.id, { status: "active" })}
                        >
                          Approve
                        </button>
                        <button
                          className="ml-2 text-destructive underline"
                          onClick={() => void change(u.id, { status: "suspended" })}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        className="ml-2 text-primary underline"
                        onClick={() =>
                          void change(u.id, {
                            status: u.status === "active" ? "suspended" : "active",
                          })
                        }
                      >
                        {u.status === "active" ? "Suspend" : "Activate"}
                      </button>
                    )}
                    <button
                      className="ml-2 text-destructive underline"
                      onClick={() => void remove(u.id)}
                    >
                      Delete
                    </button>
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
