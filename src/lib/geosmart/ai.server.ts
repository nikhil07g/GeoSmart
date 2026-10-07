import { AI_CLASS_MAP, type WasteCategory } from "./constants";

export function severityFromConfidence(category: string, confidence: number) {
  const heavy = ["E-Waste", "Illegal Dumping", "Construction Waste"];
  if (heavy.includes(category) && confidence >= 70) return "CRITICAL";
  if (confidence >= 85) return "HIGH";
  if (confidence >= 60) return "MEDIUM";
  return "LOW";
}

export function normalizeAiResponse(payload: { class?: string; confidence?: number }) {
  const raw = (payload.class ?? "mixed").toLowerCase().trim();
  const category: WasteCategory =
    AI_CLASS_MAP[raw] ?? AI_CLASS_MAP[raw.replace(/[\s-]/g, "_")] ?? "Mixed Waste";
  const confidence = Math.round(Math.min(100, Math.max(0, (payload.confidence ?? 0.6) * 100)));
  return {
    category,
    confidence,
    severity: severityFromConfidence(category, confidence),
    rawClass: raw,
    source: "ai-service" as const,
  };
}

/** Deterministic demo classifier used when the trained model is offline. */
export function mockClassify(imageBase64: string) {
  const classes = Object.keys(AI_CLASS_MAP);
  let hash = 0;
  const sample = imageBase64.slice(-512);
  for (let i = 0; i < sample.length; i++) hash = (hash * 31 + sample.charCodeAt(i)) >>> 0;
  const raw = classes[hash % classes.length] ?? "mixed";
  const confidence = 62 + (hash % 34);
  const category = AI_CLASS_MAP[raw] ?? "Mixed Waste";
  return {
    category,
    confidence,
    severity: severityFromConfidence(category, confidence),
    rawClass: raw,
    source: "mock" as const,
  };
}
