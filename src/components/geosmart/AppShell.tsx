import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Map as MapIcon,
  Flame,
  Users,
  Route as RouteIcon,
  BarChart3,
  Database,
  Settings,
  UserCircle,
  Bell,
  LogOut,
  Menu,
  ClipboardList,
  PlusCircle,
  Recycle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/api/authApi";
import { io } from "socket.io-client";
import { getToken } from "@/api/api";
import { listNotifications, markNotificationRead } from "@/api/notificationApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/geosmart/types";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV: Record<AppRole, NavItem[]> = {
  citizen: [
    { to: "/citizen/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/citizen/report", label: "Report waste", icon: <PlusCircle className="h-4 w-4" /> },
    { to: "/citizen/complaints", label: "My complaints", icon: <FileText className="h-4 w-4" /> },
    { to: "/citizen/profile", label: "Profile", icon: <UserCircle className="h-4 w-4" /> },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/admin/complaints", label: "Complaints", icon: <FileText className="h-4 w-4" /> },
    { to: "/admin/map", label: "Live map", icon: <MapIcon className="h-4 w-4" /> },
    { to: "/admin/hotspots", label: "Hotspots", icon: <Flame className="h-4 w-4" /> },
    { to: "/admin/workers", label: "Workers", icon: <Users className="h-4 w-4" /> },
    { to: "/admin/routes", label: "Route planner", icon: <RouteIcon className="h-4 w-4" /> },
    { to: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { to: "/admin/dataset", label: "AI dataset", icon: <Database className="h-4 w-4" /> },
    { to: "/admin/users", label: "Users", icon: <UserCircle className="h-4 w-4" /> },
    { to: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ],
  worker: [
    { to: "/worker/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/worker/tasks", label: "My tasks", icon: <ClipboardList className="h-4 w-4" /> },
    { to: "/worker/routes", label: "My route", icon: <RouteIcon className="h-4 w-4" /> },
    { to: "/worker/profile", label: "Profile", icon: <UserCircle className="h-4 w-4" /> },
  ],
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });
  return (
    <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-sm font-semibold">Notifications</p>
        <button onClick={onClose} aria-label="Close notifications">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {data.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          data.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                await markNotificationRead(n.id);
                void queryClient.invalidateQueries({ queryKey: ["notifications"] });
              }}
              className={cn(
                "block w-full border-b border-border/60 px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/60",
                !n.read && "bg-primary/5",
              )}
            >
              <p className="font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
}) {
  const { profile, role, user } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const queryClient = useQueryClient();
  const items = NAV[(role ?? "citizen") as AppRole];
  const roleLabel = role === "admin" ? "Municipal admin" : role === "worker" ? "Municipal worker" : "Citizen";

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
  });
  const unread = notifications.filter((n) => !n.read).length;

  // Real-time updates: complaints + notifications
  useEffect(() => {
    if (!user) return;
    const socket = io(
      (import.meta.env["VITE_SOCKET_URL"] as string | undefined) ?? "http://localhost:5000",
      { auth: { token: getToken() } },
    );
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["hotspots"] });
    };
    socket.on("complaintCreated", refresh);
    socket.on("complaintAssigned", refresh);
    socket.on("complaintStatusUpdated", refresh);
    socket.on("complaintResolved", refresh);
    socket.on("newCriticalComplaint", refresh);
    socket.on("notificationCreated", refresh);
    return () => {
      socket.disconnect();
    };
  }, [user, queryClient]);

  useEffect(() => setSidebarOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          sidebarOpen && "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <Recycle className="h-6 w-6 text-sidebar-primary" />
          <div>
            <p className="text-sm font-bold">GeoSmart</p>
            <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
              {roleLabel} portal
            </p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.to && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-sidebar-border p-3">
          <button
            onClick={async () => {
              await logout();
              queryClient.clear();
              await router.navigate({ to: "/auth" });
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                ) : null}
              </Button>
              {notifOpen ? <NotificationPanel onClose={() => setNotifOpen(false)} /> : null}
            </div>
            <div className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 sm:flex">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{profile?.name ?? "Account"}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{roleLabel}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 lg:p-6">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card lg:hidden">
          {items.slice(0, 4).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
                pathname === item.to && "text-primary",
              )}
            >
              {item.icon}
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
