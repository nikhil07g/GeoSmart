export const WASTE_CATEGORIES = [
  "Plastic Waste",
  "Organic Waste",
  "E-Waste",
  "Construction Waste",
  "Glass Waste",
  "Paper Waste",
  "Metal Waste",
  "Mixed Waste",
  "Illegal Dumping",
  "Other",
] as const;

export type WasteCategory = (typeof WASTE_CATEGORIES)[number];

export const COMPLAINT_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const LIFECYCLE: ComplaintStatus[] = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];

/** Maps a raw AI class label to an internal waste category. */
export const AI_CLASS_MAP: Record<string, WasteCategory> = {
  plastic: "Plastic Waste",
  organic: "Organic Waste",
  biodegradable: "Organic Waste",
  ewaste: "E-Waste",
  e_waste: "E-Waste",
  electronic: "E-Waste",
  construction: "Construction Waste",
  debris: "Construction Waste",
  glass: "Glass Waste",
  paper: "Paper Waste",
  cardboard: "Paper Waste",
  metal: "Metal Waste",
  mixed: "Mixed Waste",
  trash: "Mixed Waste",
  illegal_dumping: "Illegal Dumping",
  dumping: "Illegal Dumping",
};

export const DEFAULT_CENTER: [number, number] = [17.385, 78.4867];

export function severityTone(severity: SeverityLevel) {
  switch (severity) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "warning";
    case "MEDIUM":
      return "info";
    default:
      return "success";
  }
}

export function statusLabel(status: ComplaintStatus) {
  return status.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Great-circle distance in metres. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const DUPLICATE_RADIUS_METERS = Number(
  import.meta.env['VITE_DUPLICATE_RADIUS_METERS'] ?? 100,
);
