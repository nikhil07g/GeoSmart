import { Router } from "express";
import { unlink } from "node:fs/promises";
import {
  Complaint,
  ComplaintHistory,
  Dataset,
  Notification,
  Route,
  TrainingJob,
  User,
  Worker,
} from "../models/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload, datasetUpload, publicFile } from "../services/storageService.js";
import { classifyImage, serviceStatus } from "../services/aiService.js";
import { distanceKm, optimizeWaypoints } from "../services/routeService.js";
import { asyncRoute, ok, fail } from "../utils/response.js";

export const workersRouter = Router();
workersRouter.use(requireAuth);
workersRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const rows =
      req.user.role === "admin"
        ? await Worker.find().populate("user", "name email phone active")
        : await Worker.find({ user: req.user.id }).populate("user", "name email phone active");
    const workload = await Complaint.aggregate([
      { $match: { assignedWorker: { $ne: null } } },
      {
        $group: {
          _id: "$assignedWorker",
          assigned: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ["$status", ["ASSIGNED", "IN_PROGRESS"]] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] } },
          totalHours: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "RESOLVED"] }, { $ne: ["$resolvedAt", null] }] },
                { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] },
                0,
              ],
            },
          },
        },
      },
    ]);
    ok(
      res,
      rows.map((w) => ({
        id: w.id,
        user_id: w.user.id,
        name: w.user.name,
        email: w.user.email,
        phone: w.user.phone,
        employee_id: w.employeeId,
        department: w.department,
        availability: w.availability === "AVAILABLE",
        current_lat: w.currentLocation?.[1],
        current_lng: w.currentLocation?.[0],
        assigned: workload.find((x) => String(x._id) === w.id)?.assigned ?? 0,
        resolved: workload.find((x) => String(x._id) === w.id)?.resolved ?? 0,
        open: workload.find((x) => String(x._id) === w.id)?.open ?? 0,
        avgResolutionHours: workload.find((x) => String(x._id) === w.id)?.resolved
          ? Math.round(
              (workload.find((x) => String(x._id) === w.id).totalHours /
                workload.find((x) => String(x._id) === w.id).resolved) *
                10,
            ) / 10
          : 0,
      })),
    );
  }),
);
workersRouter.post(
  "/",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { name, email, password, employee_id, department } = req.body;
    if (!name || !email || !password)
      return fail(res, 422, "Name, email and temporary password are required");
    const user = await User.create({
      name,
      email,
      password,
      phone: req.body.phone,
      role: "worker",
    });
    const worker = await Worker.create({ user: user._id, employeeId: employee_id, department });
    ok(
      res,
      { id: worker.id, user_id: user.id, name, email, employee_id: worker.employeeId, department },
      201,
    );
  }),
);
workersRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const w = await Worker.findById(req.params.id);
    if (!w) return fail(res, 404, "Worker not found");
    if (req.user.role !== "admin" && String(w.user) !== req.user.id)
      return fail(res, 403, "Forbidden");
    if (req.body.department !== undefined && req.user.role === "admin")
      w.department = req.body.department;
    if (req.body.availability !== undefined)
      w.availability =
        typeof req.body.availability === "boolean"
          ? req.body.availability
            ? "AVAILABLE"
            : "OFFLINE"
          : req.body.availability;
    if (req.body.current_lat !== undefined && req.body.current_lng !== undefined)
      w.currentLocation = [Number(req.body.current_lng), Number(req.body.current_lat)];
    await w.save();
    if (req.body.name !== undefined || req.body.phone !== undefined) {
      const u = await User.findById(w.user);
      if (req.body.name !== undefined) u.name = req.body.name;
      if (req.body.phone !== undefined) u.phone = req.body.phone;
      await u.save();
    }
    ok(res, w);
  }),
);
export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);
uploadsRouter.post(
  "/",
  upload.single("image"),
  asyncRoute(async (req, res) => {
    if (!req.file) return fail(res, 422, "Image is required");
    const url = publicFile(req.file);
    ok(res, { url, path: url }, 201);
  }),
);

export const hotspotsRouter = Router();
hotspotsRouter.use(requireAuth);
hotspotsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const days = Number(req.query.days);
    const match = {
      latitude: { $ne: null },
      longitude: { $ne: null },
      status: { $ne: "REJECTED" },
    };
    if (days > 0) match.createdAt = { $gte: new Date(Date.now() - days * 86400000) };
    const rows = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { lat: { $round: ["$latitude", 3] }, lng: { $round: ["$longitude", 3] } },
          complaintCount: { $sum: 1 },
          severityScore: { $avg: "$severityScore" },
        },
      },
      { $sort: { complaintCount: -1 } },
      { $limit: 100 },
    ]);
    ok(
      res,
      rows.map((x, index) => ({
        id: `hotspot-${index + 1}`,
        latitude: x._id.lat,
        longitude: x._id.lng,
        complaintCount: x.complaintCount,
        complaint_count: x.complaintCount,
        severityScore: Math.round(x.severityScore),
        radius: Math.min(500, 100 + x.complaintCount * 15),
        severity_score: Math.round(x.severityScore),
      })),
    );
  }),
);

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole("admin"));
analyticsRouter.get(
  "/overview",
  asyncRoute(async (_req, res) => {
    const [rows, workers] = await Promise.all([
      Complaint.find().select("status severity category createdAt resolvedAt"),
      Worker.countDocuments({ availability: { $ne: "OFFLINE" } }),
    ]);
    const totals = {
      total: rows.length,
      pending: rows.filter((x) => x.status === "PENDING").length,
      assigned: rows.filter((x) => x.status === "ASSIGNED").length,
      inProgress: rows.filter((x) => x.status === "IN_PROGRESS").length,
      resolved: rows.filter((x) => x.status === "RESOLVED").length,
      rejected: rows.filter((x) => x.status === "REJECTED").length,
      critical: rows.filter((x) => x.severity === "CRITICAL").length,
      today: rows.filter((x) => x.createdAt >= new Date(new Date().setHours(0, 0, 0, 0))).length,
      activeWorkers: workers,
    };
    const byDay = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        date: key.slice(5),
        complaints: rows.filter((x) => x.createdAt.toISOString().slice(0, 10) === key).length,
        resolved: rows.filter((x) => x.resolvedAt?.toISOString().slice(0, 10) === key).length,
      };
    });
    const group = (key) =>
      [...rows.reduce((m, x) => m.set(x[key], (m.get(x[key]) ?? 0) + 1), new Map())].map(
        ([name, value]) => ({ name, value }),
      );
    const solved = rows.filter((x) => x.resolvedAt);
    const avgResolutionHours = solved.length
      ? Math.round(
          (solved.reduce((s, x) => s + (x.resolvedAt - x.createdAt) / 3600000, 0) / solved.length) *
            10,
        ) / 10
      : 0;
    ok(res, {
      totals,
      byDay,
      byCategory: group("category"),
      bySeverity: group("severity"),
      byMonth: [],
      avgResolutionHours,
      resolvedPercentage: rows.length ? Math.round((totals.resolved / rows.length) * 100) : 0,
    });
  }),
);
analyticsRouter.get(
  "/complaints",
  asyncRoute(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const rows = await Complaint.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - days * 86400000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          complaints: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    ok(
      res,
      rows.map((x) => ({ date: x._id, complaints: x.complaints, resolved: x.resolved })),
    );
  }),
);
analyticsRouter.get(
  "/categories",
  asyncRoute(async (_req, res) =>
    ok(
      res,
      await Complaint.aggregate([
        { $group: { _id: "$category", value: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", value: 1 } },
      ]),
    ),
  ),
);
analyticsRouter.get(
  "/severity",
  asyncRoute(async (_req, res) =>
    ok(
      res,
      await Complaint.aggregate([
        { $group: { _id: "$severity", value: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", value: 1 } },
      ]),
    ),
  ),
);
analyticsRouter.get(
  "/workers",
  asyncRoute(async (_req, res) =>
    ok(
      res,
      await Complaint.aggregate([
        {
          $group: {
            _id: "$assignedWorker",
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ),
  ),
);
analyticsRouter.get("/hotspots", (_req, res) => res.redirect("/api/hotspots"));

export const routesRouter = Router();
routesRouter.use(requireAuth);
routesRouter.post(
  "/optimize",
  requireRole("admin", "worker"),
  asyncRoute(async (req, res) => {
    const query = {
      _id: { $in: req.body.complaintIds ?? [] },
      status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
    };
    if (req.user.role === "worker") {
      const worker = await Worker.findOne({ user: req.user.id });
      query.assignedWorker = worker?._id;
    }
    const docs = await Complaint.find(query);
    if (!docs.length) return fail(res, 422, "No eligible complaints to route");
    const start = req.body.startLocation
      ? [Number(req.body.startLocation.latitude), Number(req.body.startLocation.longitude)]
      : [docs[0].latitude, docs[0].longitude];
    const result = optimizeWaypoints(start, docs);
    const orderedDocs = result.ordered;
    const ordered = orderedDocs.map((c, i) => ({
      id: c.id,
      title: c.title,
      lat: c.latitude,
      lng: c.longitude,
      order: i + 1,
    }));
    const coords = [start, ...ordered.map((x) => [x.lat, x.lng])];
    let km = 0;
    for (let i = 1; i < coords.length; i++) km += distanceKm(coords[i - 1], coords[i]);
    const duration = Math.round((km / 20) * 60 + ordered.length * 5);
    const saved = await Route.create({
      worker: req.body.workerId,
      complaints: docs.map((x) => x._id),
      orderedComplaints: ordered,
      routeCoordinates: coords,
      distance: km,
      estimatedDuration: duration,
      createdBy: req.user.id,
    });
    ok(res, {
      ...saved.toObject(),
      ordered,
      coordinates: coords,
      distanceMeters: Math.round(km * 1000),
      distance: Math.round(km * 10) / 10,
      estimatedDuration: duration,
      durationMinutes: duration,
      algorithm: result.algorithm,
    });
  }),
);

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const q = req.user.role === "admin" ? {} : { user: req.user.id };
    const rows = await Notification.find(q).sort({ createdAt: -1 }).limit(50);
    ok(
      res,
      rows.map((n) => ({ ...n.toObject(), id: n.id, created_at: n.createdAt })),
    );
  }),
);
notificationsRouter.patch(
  "/:id/read",
  asyncRoute(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...(req.user.role === "admin" ? {} : { user: req.user.id }) },
      { read: true },
      { new: true },
    );
    if (!n) return fail(res, 404, "Notification not found");
    ok(res, n);
  }),
);

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.get(
  "/health",
  asyncRoute(async (_req, res) => {
    ok(res, await serviceStatus());
  }),
);
aiRouter.post(
  "/classify",
  upload.single("image"),
  asyncRoute(async (req, res) => {
    if (!req.file) return fail(res, 422, "Image is required");
    try {
      const result = await classifyImage(req.file.path);
      const { scoreSeverity } = await import("../services/severityService.js");
      ok(res, { ...result, ...scoreSeverity(result) });
    } catch {
      return fail(res, 503, "AI classification service unavailable");
    } finally {
      await unlink(req.file.path).catch(() => {});
    }
  }),
);
aiRouter.get(
  "/status",
  requireRole("admin"),
  asyncRoute(async (_req, res) => ok(res, await serviceStatus())),
);
aiRouter.get(
  "/training-status",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const job = await TrainingJob.findOne(
      req.query.datasetId ? { dataset: req.query.datasetId } : {},
    ).sort({ createdAt: -1 });
    ok(res, job ?? { status: "NOT_STARTED", available: Boolean(process.env.AI_SERVICE_URL) });
  }),
);
aiRouter.post(
  "/retrain",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    if (!process.env.AI_SERVICE_URL) return fail(res, 503, "AI training service is not configured");
    const dataset = await Dataset.findById(req.body.datasetId);
    if (!dataset) return fail(res, 404, "Dataset not found");
    let status = "QUEUED",
      error;
    try {
      const axios = (await import("axios")).default;
      const response = await axios.post(
        `${process.env.AI_SERVICE_URL.replace(/\/$/, "")}/retrain`,
        { datasetId: dataset.id },
        { timeout: 8000 },
      );
      status = response.data.status ?? "QUEUED";
    } catch (e) {
      status = "FAILED";
      error = e.message;
    }
    const job = await TrainingJob.create({
      dataset: dataset._id,
      status,
      requestedBy: req.user.id,
      error,
    });
    ok(res, { status, dispatched: true, jobId: job.id, error }, status === "FAILED" ? 502 : 202);
  }),
);
aiRouter.post(
  "/dataset/upload",
  requireRole("admin"),
  datasetUpload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) return fail(res, 422, "Dataset file is required");
    const row = await Dataset.create({
      name: req.body.name || req.file.originalname,
      description: req.body.description,
      fileUrl: publicFile(req.file),
      fileType: req.file.mimetype,
      uploadedBy: req.user.id,
    });
    ok(res, row, 201);
  }),
);

export const datasetsRouter = Router();
datasetsRouter.use(requireAuth, requireRole("admin"));
datasetsRouter.get(
  "/",
  asyncRoute(async (_req, res) => {
    const jobs = await TrainingJob.find().sort({ createdAt: -1 });
    const rows = (await Dataset.find().sort({ createdAt: -1 })).map((d) => ({
      ...d.toObject(),
      id: d.id,
      file_url: d.fileUrl,
      file_type: d.fileType,
      num_classes: d.numClasses,
      num_images: d.numImages,
      created_at: d.createdAt,
      status: jobs.find((j) => String(j.dataset) === d.id)?.status ?? "NOT_STARTED",
      last_trained_at: jobs.find((j) => String(j.dataset) === d.id)?.completedAt ?? null,
    }));
    ok(res, rows);
  }),
);
datasetsRouter.post(
  "/",
  datasetUpload.single("file"),
  asyncRoute(async (req, res) => {
    const d = await Dataset.create({
      name: req.body.name,
      description: req.body.description,
      fileUrl: publicFile(req.file) || req.body.file_url,
      fileType: req.file?.mimetype || req.body.file_type,
      numClasses: Number(req.body.num_classes || 0),
      numImages: Number(req.body.num_images || 0),
      uploadedBy: req.user.id,
    });
    ok(
      res,
      {
        ...d.toObject(),
        id: d.id,
        file_url: d.fileUrl,
        file_type: d.fileType,
        num_classes: d.numClasses,
        num_images: d.numImages,
        created_at: d.createdAt,
        status: "NOT_STARTED",
      },
      201,
    );
  }),
);
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("admin"));
usersRouter.get(
  "/",
  asyncRoute(async (_req, res) =>
    ok(
      res,
      (await User.find().sort({ createdAt: -1 })).map((u) => ({
        ...u.toObject(),
        id: u.id,
        user_id: u.id,
        created_at: u.createdAt,
      })),
    ),
  ),
);
usersRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const { name, email, password, role, phone, address } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email ?? "") || !password)
      return fail(res, 422, "Enter a name, valid email and password");
    if (!["citizen", "worker", "admin"].includes(role))
      return fail(res, 422, "Choose a valid account type");
    const user = await User.create({
      name: name.trim(),
      email,
      password,
      role,
      phone,
      address,
      status: "active",
      active: true,
    });
    if (role === "worker")
      await Worker.create({
        user: user._id,
        employeeId: "GS-W-" + user.id.slice(-6).toUpperCase(),
        department: "Sanitation",
        availability: "AVAILABLE",
      });
    ok(
      res,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        active: user.active,
        created_at: user.createdAt,
      },
      201,
    );
  }),
);
usersRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, "User not found");
    if (
      user.role === "admin" &&
      (req.body.active === false ||
        req.body.status === "suspended" ||
        (req.body.role && req.body.role !== "admin")) &&
      (await User.countDocuments({ role: "admin", active: true })) <= 1
    )
      return fail(res, 409, "Cannot deactivate the final administrator");
    if (req.body.role && ["admin", "worker", "citizen"].includes(req.body.role)) {
      user.role = req.body.role;
      if (req.body.role === "worker")
        await Worker.updateOne(
          { user: user._id },
          {
            $setOnInsert: {
              user: user._id,
              employeeId: "GS-W-" + user.id.slice(-6).toUpperCase(),
              department: "Sanitation",
            },
          },
          { upsert: true },
        );
      else await Worker.deleteOne({ user: user._id });
    }
    if (typeof req.body.active === "boolean") {
      user.active = req.body.active;
      user.status = req.body.active ? "active" : "suspended";
    }
    if (["active", "pending", "suspended"].includes(req.body.status)) {
      user.status = req.body.status;
      user.active = req.body.status === "active";
      if (user.role === "worker")
        await Worker.updateOne(
          { user: user._id },
          { $set: { availability: user.active ? "AVAILABLE" : "OFFLINE" } },
          { upsert: true, setDefaultsOnInsert: true },
        );
    }
    await user.save();
    ok(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      status: user.status,
    });
  }),
);
usersRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, "User not found");
    if (user.role === "admin" && (await User.countDocuments({ role: "admin", active: true })) <= 1)
      return fail(res, 409, "Cannot remove the final administrator");
    user.active = false;
    user.status = "suspended";
    await user.save();
    await Worker.deleteOne({ user: user._id });
    ok(res, { deleted: true, retainedForAudit: true });
  }),
);
