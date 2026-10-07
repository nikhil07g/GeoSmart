import axios from "axios";
import { randomInt } from "node:crypto";
import FormData from "form-data";
import { createReadStream } from "node:fs";

const categoryMap = {
  plastic: "Plastic Waste",
  organic: "Organic Waste",
  biodegradable: "Organic Waste",
  ewaste: "E-Waste",
  electronic: "E-Waste",
  construction: "Construction Waste",
  glass: "Glass Waste",
  paper: "Paper Waste",
  metal: "Metal Waste",
  dumping: "Illegal Dumping",
  illegal_dumping: "Illegal Dumping",
  mixed: "Mixed Waste",
};

export async function classifyImage(filePath) {
  const base = process.env.AI_SERVICE_URL;
  if (base) {
    try {
      const form = new FormData();
      form.append("image", createReadStream(filePath));
      const { data } = await axios.post(`${base.replace(/\/$/, "")}/predict`, form, {
        headers: form.getHeaders(),
        timeout: 12000,
      });
      const label = String(data.class ?? "mixed")
        .toLowerCase()
        .replace(/[\s-]/g, "");
      const rawConfidence = Number(data.confidence ?? 0.5);
      const confidence = Math.max(
        0,
        Math.min(100, Math.round((Number.isFinite(rawConfidence) ? rawConfidence : 0.5) * 100)),
      );
      return {
        category: categoryMap[label] ?? "Mixed Waste",
        confidence,
        rawClass: String(data.class ?? "mixed"),
        source: "ai-service",
      };
    } catch (error) {
      console.warn("AI service unavailable; using development fallback:", error.message);
    }
  }
  const categories = Object.values(categoryMap);
  return {
    category: categories[randomInt(categories.length)],
    confidence: randomInt(65, 91),
    rawClass: "mock",
    source: "mock",
  };
}

export async function serviceStatus() {
  if (!process.env.AI_SERVICE_URL) return { available: false, mode: "mock" };
  try {
    await axios.get(`${process.env.AI_SERVICE_URL.replace(/\/$/, "")}/health`, { timeout: 3000 });
    return { available: true, mode: "external" };
  } catch {
    return { available: false, mode: "mock" };
  }
}
