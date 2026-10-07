import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optimizeStops } from "./routing.server";

/** POST /api/routes/optimize equivalent: orders assigned complaints into a route. */
export const optimizeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workerId?: string | undefined;
      startLocation: { latitude: number; longitude: number };
      complaintIds: string[];
    }) => {
      if (!input?.startLocation) throw new Error("startLocation is required");
      if (!Array.isArray(input.complaintIds) || input.complaintIds.length === 0) {
        throw new Error("At least one complaint is required");
      }
      if (input.complaintIds.length > 25) throw new Error("Too many stops (max 25)");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("complaints")
      .select("id, title, latitude, longitude, severity_score")
      .in("id", data.complaintIds);
    if (error) throw new Error(error.message);

    const stops = (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      lat: r.latitude,
      lng: r.longitude,
    }));
    const start = {
      id: "start",
      title: "Depot / current location",
      lat: data.startLocation.latitude,
      lng: data.startLocation.longitude,
    };

    const { order, distanceMeters, algorithm } = optimizeStops(start, stops);
    const coordinates: Array<[number, number]> = [
      [start.lat, start.lng],
      ...order.map((s) => [s.lat, s.lng] as [number, number]),
    ];
    // 18 km/h average municipal vehicle speed + 6 minutes handling per stop.
    const durationMinutes = Math.round((distanceMeters / 1000 / 18) * 60 + order.length * 6);

    return {
      workerId: data.workerId ?? null,
      ordered: order.map((s, i) => ({ ...s, order: i + 1 })),
      coordinates,
      distanceMeters,
      durationMinutes,
      algorithm,
    };
  });
