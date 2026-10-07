import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "./Feedback";
import type { AppRole } from "@/lib/geosmart/types";

export function RoleGate({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== allow) void navigate({ to: "/unauthorized" });
  }, [loading, role, allow, navigate]);

  if (loading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Loading workspace" />
      </div>
    );
  }
  if (role !== allow) return null;
  return <>{children}</>;
}
