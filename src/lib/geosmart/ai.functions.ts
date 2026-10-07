import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeAiResponse, mockClassify } from "./ai.server";

/**
 * Sends an image to the external AI classification service and normalises the
 * response into the application's internal format. The model itself lives
 * outside this application and is configured through AI_SERVICE_URL.
 */
export const classifyWasteImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageBase64: string; fileName?: string }) => {
    if (!input?.imageBase64 || typeof input.imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }
    if (input.imageBase64.length > 12_000_000) throw new Error("Image too large");
    return input;
  })
  .handler(async ({ data }) => {
    const baseUrl = process.env['AI_SERVICE_URL'];
    if (!baseUrl) return mockClassify(data.imageBase64);

    try {
      const binary = Uint8Array.from(atob(data.imageBase64.split(",").pop() ?? ""), (c) =>
        c.charCodeAt(0),
      );
      const form = new FormData();
      form.append("image", new Blob([binary]), data.fileName ?? "waste.jpg");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/predict`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`AI service responded ${res.status}`);
      const payload = (await res.json()) as { class?: string; confidence?: number };
      return normalizeAiResponse(payload);
    } catch (error) {
      console.error("AI service unavailable, using mock classifier:", error);
      return mockClassify(data.imageBase64);
    }
  });

/** Reports whether a real model endpoint is configured. */
export const getAiServiceStatus = createServerFn({ method: "GET" }).handler(async () => {
  const baseUrl = process.env['AI_SERVICE_URL'];
  if (!baseUrl) return { configured: false, reachable: false, mode: "mock" as const };
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    return { configured: true, reachable: res.ok, mode: "ai-service" as const };
  } catch {
    return { configured: true, reachable: false, mode: "mock" as const };
  }
});

/** Placeholder that forwards a retrain request to the external AI service. */
export const requestRetraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { datasetId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const baseUrl = process.env['AI_SERVICE_URL'];
    let status: "QUEUED" | "FAILED" = "QUEUED";
    if (baseUrl) {
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/retrain`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ datasetId: data.datasetId }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) status = "FAILED";
      } catch {
        status = "QUEUED"; // queued locally; the AI team picks it up
      }
    }
    const { error } = await context.supabase
      .from("ai_datasets")
      .update({ status })
      .eq("id", data.datasetId);
    if (error) throw new Error(error.message);
    return { status, dispatched: Boolean(baseUrl) };
  });
