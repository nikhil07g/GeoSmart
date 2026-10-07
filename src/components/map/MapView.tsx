import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapViewProps } from "./map-types";

const LeafletMap = lazy(() => import("./LeafletMap"));

export function MapView(props: MapViewProps) {
  const fallback = <Skeleton className={props.className ?? "h-[420px] w-full"} />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <LeafletMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
