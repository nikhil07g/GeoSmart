import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "node:fs";

const modelCategories = {
  cardboard: "Paper Waste",
  glass: "Glass Waste",
  metal: "Metal Waste",
  paper: "Paper Waste",
  plastic: "Plastic Waste",
  trash: "Mixed Waste",
};

const serviceBase = () => process.env.AI_SERVICE_URL?.trim().replace(/\/$/, "");

function normalizePrediction(data) {
  const rawClass = String(data?.class ?? data?.prediction ?? "").trim();
  const classKey = rawClass.toLowerCase();
  const category = modelCategories[classKey];
  if (!category) throw new Error("AI model returned an unsupported class");

  const rawConfidence = Number(data?.confidence);
  if (!Number.isFinite(rawConfidence) || rawConfidence < 0 || rawConfidence > 100)
    throw new Error("AI model returned an invalid confidence");
  const confidence = Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence);
  return { category, confidence, rawClass, source: "ai-service", available: true };
}

export async function classifyImage(filePath) {
  const base = serviceBase();
  if (!base) throw new Error("AI_SERVICE_URL is not configured");

  console.info("[AI] Sending image to AI service");
  try {
    const form = new FormData();
    form.append("image", createReadStream(filePath));
    const timeout = Number(process.env.AI_SERVICE_TIMEOUT || 30000);
    const { data } = await axios.post(`${base}/predict`, form, {
      headers: form.getHeaders(),
      timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 30000,
    });
    const prediction = normalizePrediction(data);
    console.info("[AI] AI service response received");
    console.info(`[AI] Classification: ${prediction.rawClass}`);
    console.info(`[AI] Confidence: ${prediction.confidence}%`);
    return prediction;
  } catch (error) {
    console.error("[AI] Classification service unavailable:", error.message);
    throw new Error("AI classification service unavailable", { cause: error });
  }
}

export async function serviceStatus() {
  const base = serviceBase();
  if (!base) return { available: false, mode: "unconfigured" };
  try {
    const { data } = await axios.get(`${base}/health`, { timeout: 3000 });
    const available = data?.status === "ok";
    return { available, mode: available ? "external" : "unavailable" };
  } catch {
    return { available: false, mode: "unavailable" };
  }
}
