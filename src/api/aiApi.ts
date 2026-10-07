import { api, uploadBody } from "@/api/api";
import type { AiClassification } from "@/lib/geosmart/types";
export async function classifyWasteImage(file: File) {
  const { validateImage } = await import("@/api/uploadApi");
  const invalid = validateImage(file);
  if (invalid) throw new Error(invalid);
  return api<AiClassification>("/ai/classify", {
    method: "POST",
    body: uploadBody({ image: file }),
  });
}
export async function getAiServiceStatus() {
  const s = await api<{ available: boolean; mode: string }>("/ai/status");
  return { configured: s.mode !== "mock", reachable: s.available, mode: s.mode };
}
export async function requestRetraining(input: { datasetId: string }) {
  return api("/ai/retrain", { method: "POST", body: JSON.stringify(input) });
}
