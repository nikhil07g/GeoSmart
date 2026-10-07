import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import auth from "./routes/auth.js";
import complaints from "./routes/complaints.js";
import {
  workersRouter,
  hotspotsRouter,
  analyticsRouter,
  routesRouter,
  notificationsRouter,
  aiRouter,
  datasetsRouter,
  usersRouter,
  uploadsRouter,
} from "./routes/platform.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(",") ?? "http://localhost:5173",
    credentials: false,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));
const here = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(here, "uploads"), { maxAge: "7d", immutable: true }));
app.get("/api/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));
app.use("/api/auth", auth);
app.use("/api/complaints", complaints);
app.use("/api/workers", workersRouter);
app.use("/api/hotspots", hotspotsRouter);
app.use("/api/routes", routesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/datasets", datasetsRouter);
app.use("/api/users", usersRouter);
app.use("/api/uploads", uploadsRouter);
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000)
    return res
      .status(409)
      .json({ success: false, message: "A record with those details already exists" });
  if (err.name === "ValidationError" || err.name === "CastError")
    return res.status(422).json({ success: false, message: err.message });
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ success: false, message: "File exceeds the 10 MB limit" });
  if (err.name === "MulterError")
    return res.status(422).json({ success: false, message: err.message });
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Internal server error" });
});
export default app;
