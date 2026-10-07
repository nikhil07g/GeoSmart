import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Recycle, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { login, register, sendPasswordReset } from "@/api/authApi";
import { useAuth } from "@/lib/auth-context";
import type { AppRole } from "@/lib/geosmart/types";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — GeoSmart Waste Management" },
      { name: "description", content: "Sign in or create a GeoSmart account to report waste, manage complaints or complete field tasks." },
      { property: "og:title", content: "Sign in — GeoSmart Waste Management" },
      { property: "og:description", content: "Citizen, municipal admin and field worker access to the GeoSmart platform." },
    ],
  }),
  component: AuthPage,
});

const roleHome: Record<AppRole, string> = {
  citizen: "/citizen/dashboard",
  admin: "/admin/dashboard",
  worker: "/worker/dashboard",
};

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      void navigate({ to: roleHome[role] });
    }
  }, [loading, user, role, navigate]);

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      toast.success("Welcome back");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const onRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        name: String(form.get("name")),
        phone: String(form.get("phone") ?? ""),
        address: String(form.get("address") ?? ""),
        role: String(form.get("role") ?? "citizen") as AppRole,
      });
      toast.success("Account created — you're signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    const email = window.prompt("Enter your account email to receive a reset link");
    if (!email) return;
    try {
      await sendPasswordReset(email);
      toast.success("Reset link sent — check your inbox");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-gradient relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
          <Recycle className="h-6 w-6" /> GeoSmart
        </Link>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            Cleaner streets start with one photo.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            AI classification, severity scoring and optimised crew routing — all in one municipal platform.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">Smart Waste Management Platform</p>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 font-extrabold lg:hidden">
            <Recycle className="h-6 w-6 text-primary" /> GeoSmart
          </Link>
          <Tabs defaultValue={mode === "register" ? "register" : "login"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Sign in
                </Button>
                <button type="button" onClick={onReset} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  Forgot your password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={onRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-name">Full name</Label>
                  <Input id="reg-name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="reg-phone">Phone</Label>
                    <Input id="reg-phone" name="phone" />
                  </div>
                  <div>
                    <Label htmlFor="reg-role">Account type</Label>
                    <select
                      id="reg-role"
                      name="role"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      defaultValue="citizen"
                    >
                      <option value="citizen">Citizen</option>
                      <option value="worker">Field worker</option>
                      <option value="admin">Municipal admin</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reg-address">Address</Label>
                  <Input id="reg-address" name="address" />
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" name="password" type="password" required minLength={6} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
