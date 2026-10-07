import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/geosmart/AppShell";
import { RoleGate } from "@/components/geosmart/RoleGate";
import { LoadingSpinner } from "@/components/geosmart/Feedback";
import { listUsers } from "@/api/adminApi";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — GeoSmart admin" },
      { name: "description", content: "Directory of citizens, field workers and administrators on the platform." },
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
  const { data = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });

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
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold capitalize">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
