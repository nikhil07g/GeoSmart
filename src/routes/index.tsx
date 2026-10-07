import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Recycle, Brain, MapPin, Route as RouteIcon, ShieldCheck, Activity, ArrowRight, Camera, Truck, BarChart3,
} from "lucide-react";
import heroCity from "@/assets/hero-city.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GeoSmart — AI Waste Reporting & Municipal Response" },
      {
        name: "description",
        content:
          "Report waste with a photo, let AI classify it, and let municipalities dispatch crews on optimised routes. GeoSmart turns citizen reports into clean streets.",
      },
      { property: "og:title", content: "GeoSmart — AI Waste Reporting & Municipal Response" },
      {
        property: "og:description",
        content:
          "Photo-based AI waste classification, severity scoring, hotspot mapping and optimised collection routes for smarter cities.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Brain, title: "AI waste classification", text: "A deep-learning service reads each photo and returns waste type with a confidence score — no manual triage." },
  { icon: Activity, title: "Automatic severity scoring", text: "Category, confidence, nearby report density and age combine into a 0–100 priority score." },
  { icon: MapPin, title: "Live GIS mapping", text: "Every complaint is geotagged. Admins see clusters, hotspots and crews on one interactive map." },
  { icon: RouteIcon, title: "Optimised collection routes", text: "A* and 2-opt route planning turns scattered pickups into the shortest realistic run." },
  { icon: ShieldCheck, title: "Duplicate detection", text: "Reports within a small radius and category are flagged before they clog the queue." },
  { icon: BarChart3, title: "Analytics that matter", text: "Resolution times, category mix, worker workload and hotspot trends, updated in real time." },
];

const steps = [
  { icon: Camera, title: "Citizen reports", text: "Snap a photo, GPS is captured automatically, AI suggests the category." },
  { icon: Truck, title: "Municipality dispatches", text: "Admins triage by severity, assign a worker and plan the day's route." },
  { icon: Recycle, title: "Worker resolves", text: "Crew uploads proof of cleanup, the citizen is notified instantly." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <Recycle className="h-6 w-6 text-primary" />
            GeoSmart
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <Link to="/about" className="hover:text-foreground">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "register" }}>Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img
          src={heroCity}
          alt="Aerial view of a city with waste collection route markers"
          width={1600}
          height={1008}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative mx-auto max-w-6xl px-4 py-28 lg:py-36">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
            Smart city · Waste intelligence
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
            Turn a photo of waste into a resolved complaint.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-primary-foreground/85">
            GeoSmart pairs AI image classification with GPS intelligence so citizens report in seconds,
            municipalities prioritise by real severity, and field crews clean up on optimised routes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="hero">
              <Link to="/auth" search={{ mode: "register" }}>
                Report waste now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="heroOutline">
              <Link to="/auth">Municipal login</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold tracking-tight">Built for the whole cleanup loop</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Everything a municipality needs between "someone dumped waste here" and "it's been cleared".
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="surface-card p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="surface-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="surface-card flex flex-col items-start gap-6 bg-primary p-10 text-primary-foreground md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Ready to clean up your ward?</h2>
            <p className="mt-2 text-primary-foreground/80">
              Create a citizen account in under a minute, or sign in with your municipal credentials.
            </p>
          </div>
          <Button asChild size="lg" variant="hero">
            <Link to="/auth" search={{ mode: "register" }}>Create free account</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-2">
            <Recycle className="h-4 w-4 text-primary" /> GeoSmart — Smart Waste Management Platform
          </p>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
