import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { deleteUser, listUsers, updateUser } from "@/api/adminApi";

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

  return (
    <AppShell title="Users" subtitle={`${data.length} accounts`}>
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
              {data.map((u) => (
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
                  <td className="px-4 py-3">{u.active ? "Active" : "Inactive"}</td>
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
                    <button
                      className="ml-2 text-primary underline"
                      onClick={() => void change(u.id, { active: !u.active })}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
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
