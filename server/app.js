import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
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
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  ...(process.env.CLIENT_URL || "").split(",").map((origin) => origin.trim()),
].filter(Boolean);
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));
const here = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(here, "uploads"), { maxAge: "7d", immutable: true }));
app.get("/api/health", (_req, res) =>
  res.json({
    success: true,
    data: { status: "ok", database: app.locals.databaseReady ? "connected" : "disconnected" },
  }),
);
app.use("/api", (req, res, next) => {
  if (!app.locals.databaseReady)
    return res.status(503).json({
      success: false,
      message: "Database connection failed. Check MONGO_URI and make sure MongoDB is running.",
    });
  next();
});
app.use(
  "/api/auth",
  (req, res, next) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24)
      return res.status(503).json({
        success: false,
        message:
          "JWT_SECRET is missing or too short. Configure a random secret of at least 24 characters.",
      });
    next();
  },
  auth,
);
app.use("/api/complaints", complaints);
app.use("/api/workers", workersRouter);
app.use("/api/hotspots", hotspotsRouter);
app.use("/api/routes", routesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/datasets", datasetsRouter);
app.use("/api/users", usersRouter);
app.use("/api/admin/users", usersRouter);
app.use("/api/uploads", uploadsRouter);
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  if (mongoose.connection.readyState !== 1)
    return res.status(503).json({
      success: false,
      message: "Database connection failed. Check MONGO_URI and make sure MongoDB is running.",
    });
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
