import { Router } from "express";
import { Complaint, ComplaintHistory, Worker } from "../models/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload, publicFile } from "../services/storageService.js";
import { classifyImage } from "../services/aiService.js";
import { scoreSeverity } from "../services/severityService.js";
import { notifyAdmins, notifyUser } from "../services/notificationService.js";
import { asyncRoute, ok, fail } from "../utils/response.js";
const router = Router();
router.use(requireAuth);
const shape = (c) => {
  const o = c.toObject ? c.toObject() : c;
  return {
    ...o,
    id: String(o._id ?? o.id),
    complaint_id: String(o._id ?? o.id),
    complaint_code: o.complaintId,
    citizen_id: String(o.citizen?._id ?? o.citizen ?? ""),
    citizen_name: o.citizen?.name,
    assigned_worker_id: o.assignedWorker?._id
      ? String(o.assignedWorker._id)
      : o.assignedWorker
        ? String(o.assignedWorker)
        : null,
    worker_name: o.assignedWorker?.user?.name,
    workers: o.assignedWorker
      ? {
          name: o.assignedWorker.user?.name,
          employee_id: o.assignedWorker.employeeId,
          phone: o.assignedWorker.user?.phone,
        }
      : null,
    image_url: o.imageUrl,
    extra_image_url: o.extraImageUrl,
    ai_category: o.aiCategory,
    ai_confidence: o.aiConfidence,
    ai_raw_class: o.aiRawClass,
    severity_score: o.severityScore,
    latitude: o.latitude ?? o.location?.coordinates?.[1],
    longitude: o.longitude ?? o.location?.coordinates?.[0],
    address: o.address,
    duplicate_of: o.duplicateOf ? String(o.duplicateOf) : null,
    resolution_image_url: o.resolutionImage,
    resolution_note: o.resolutionComment,
    admin_notes: o.adminNotes,
    resolved_at: o.resolvedAt,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
};
const populateComplaint = (query) =>
  query
    .populate("citizen", "name email")
    .populate({ path: "assignedWorker", populate: { path: "user", select: "name email phone" } });
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const q = {};
    const { status, severity, category, workerId, citizenId, search, sort } = req.query;
    if (status && status !== "all") q.status = status;
    if (severity && severity !== "all") q.severity = severity;
    if (category && category !== "all") q.category = category;
    if (workerId && workerId !== "all") q.assignedWorker = workerId;
    if (req.user.role === "citizen") q.citizen = req.user.id;
    else if (citizenId) q.citizen = citizenId;
    if (req.user.role === "worker") {
      const w = await Worker.findOne({ user: req.user.id });
      q.assignedWorker = w?._id ?? null;
    }
    if (search)
      q.$or = ["title", "complaintId", "address", "category"].map((key) => ({
        [key]: { $regex: String(search), $options: "i" },
      }));
    const sortBy =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "severity"
          ? { severityScore: -1, createdAt: -1 }
          : { createdAt: -1 };
    const rows = await populateComplaint(Complaint.find(q).sort(sortBy).limit(500));
    ok(res, rows.map(shape));
  }),
);
router.get(
  "/nearby",
  requireRole("citizen", "admin"),
  asyncRoute(async (req, res) => {
    const lat = Number(req.query.latitude),
      lng = Number(req.query.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return fail(res, 422, "Valid coordinates are required");
    const radius = Number(process.env.DUPLICATE_RADIUS_METERS || 100);
    const rows = await Complaint.find({
      status: { $nin: ["RESOLVED", "REJECTED"] },
      location: {
        $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radius },
      },
    }).limit(10);
    ok(
      res,
      rows.map((c) => ({
        id: c.id,
        complaint_code: c.complaintId,
        title: c.title,
        latitude: c.latitude,
        longitude: c.longitude,
        status: c.status,
        category: c.category,
        created_at: c.createdAt,
        distance:
          Math.round(
            2 *
              6371000 *
              Math.asin(
                Math.sqrt(
                  Math.sin(((c.latitude - lat) * Math.PI) / 180 / 2) ** 2 +
                    Math.cos((lat * Math.PI) / 180) *
                      Math.cos((c.latitude * Math.PI) / 180) *
                      Math.sin(((c.longitude - lng) * Math.PI) / 180 / 2) ** 2,
                ),
              ) *
              10,
          ) / 10,
      })),
    );
  }),
);
router.post(
  "/",
  requireRole("citizen", "admin"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "extraImage", maxCount: 1 },
  ]),
  asyncRoute(async (req, res) => {
    const lat = Number(req.body.latitude);
    const lng = Number(req.body.longitude);
    if (
      !req.body.title?.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    )
      return fail(res, 422, "Title and valid coordinates are required");
    if (!req.files?.image?.[0]) return fail(res, 422, "A JPG, PNG or WEBP image is required");
    const photoPath = req.files.image[0].path;
    let classification;
    try {
      classification = await classifyImage(photoPath);
    } catch {
      classification = {
        category: null,
        confidence: 0,
        rawClass: null,
        source: "unavailable",
        available: false,
      };
    }
    const radius = Number(process.env.DUPLICATE_RADIUS_METERS || 100);
    const nearby = await Complaint.find({
      status: { $nin: ["RESOLVED", "REJECTED"] },
      location: {
        $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radius },
      },
    })
      .limit(8)
      .select("_id duplicateCount");
    if (nearby[0])
      await Complaint.updateOne({ _id: nearby[0]._id }, { $inc: { duplicateCount: 1 } });
    const category =
      req.body.category && req.body.category !== "Mixed Waste"
        ? req.body.category
        : (classification.category ?? "Mixed Waste");
    const severityResult = scoreSeverity({
      category,
      confidence: classification.confidence ?? 0,
      duplicateCount: nearby[0] ? nearby[0].duplicateCount + 1 : 0,
      nearbyCount: nearby.length,
    });
    const complaint = await Complaint.create({
      citizen: req.user.id,
      title: req.body.title.trim(),
      description: req.body.description,
      imageUrl: publicFile(req.files.image[0]),
      extraImageUrl: publicFile(req.files.extraImage?.[0]),
      category,
      aiCategory: classification.category ?? undefined,
      aiConfidence: classification.available ? classification.confidence : undefined,
      aiRawClass: classification.rawClass ?? undefined,
      latitude: lat,
      longitude: lng,
      location: { type: "Point", coordinates: [lng, lat] },
      address: req.body.address,
      duplicateOf: nearby[0]?._id,
      ...severityResult,
    });
    await ComplaintHistory.create({
      complaint: complaint._id,
      status: "PENDING",
      changedBy: req.user.id,
      comment: "Complaint submitted",
    });
    const created = await populateComplaint(Complaint.findById(complaint._id));
    await notifyAdmins(
      req.app.get("io"),
      "New waste complaint",
      `${complaint.complaintId} · ${category}`,
      severityResult.severity === "CRITICAL" ? "CRITICAL_ALERT" : "COMPLAINT_CREATED",
    );
    if (severityResult.severity === "CRITICAL")
      req.app.get("io")?.to("role:admin").emit("newCriticalComplaint", shape(created));
    ok(res, { ...shape(created), classification, duplicate: nearby.length > 0 }, 201);
  }),
);
router.get(
  "/:id/history",
  asyncRoute(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, 404, "Complaint not found");
    if (req.user.role === "citizen" && String(complaint.citizen) !== req.user.id)
      return fail(res, 403, "Forbidden");
    const history = await ComplaintHistory.find({ complaint: complaint._id })
      .populate("changedBy", "name role")
      .sort({ createdAt: 1 });
    ok(
      res,
      history.map((h) => ({
        ...h.toObject(),
        id: h.id,
        complaint_id: String(h.complaint),
        changed_by: h.changedBy?._id ? String(h.changedBy._id) : null,
        changed_by_name: h.changedBy?.name ?? null,
        created_at: h.createdAt,
      })),
    );
  }),
);
router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const row = await populateComplaint(Complaint.findById(req.params.id));
    if (!row) return fail(res, 404, "Complaint not found");
    if (req.user.role === "citizen" && String(row.citizen._id) !== req.user.id)
      return fail(res, 403, "Forbidden");
    if (req.user.role === "worker") {
      const w = await Worker.findOne({ user: req.user.id });
      if (String(row.assignedWorker?._id) !== String(w?._id))
        return fail(res, 403, "Task is not assigned to you");
    }
    ok(res, shape(row));
  }),
);
router.patch(
  "/:id/status",
  requireRole("admin", "worker"),
  asyncRoute(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, 404, "Complaint not found");
    const valid = {
      PENDING: ["ASSIGNED", "REJECTED"],
      ASSIGNED: ["IN_PROGRESS", "PENDING", "REJECTED"],
      IN_PROGRESS: ["RESOLVED", "ASSIGNED"],
      RESOLVED: [],
      REJECTED: [],
    };
    if (!valid[complaint.status]?.includes(req.body.status))
      return fail(res, 422, `Cannot change ${complaint.status} to ${req.body.status}`);
    if (req.user.role === "worker") {
      const w = await Worker.findOne({ user: req.user.id });
      if (String(complaint.assignedWorker) !== String(w?._id))
        return fail(res, 403, "Task is not assigned to you");
    }
    complaint.status = req.body.status;
    if (req.body.status === "RESOLVED") complaint.resolvedAt = new Date();
    await complaint.save();
    await ComplaintHistory.create({
      complaint: complaint._id,
      status: complaint.status,
      changedBy: req.user.id,
      comment: req.body.comment,
    });
    const payload = shape(complaint);
    const io = req.app.get("io");
    io?.to(`user:${complaint.citizen}`).emit("complaintStatusUpdated", payload);
    if (complaint.status === "RESOLVED") {
      io?.to(`user:${complaint.citizen}`).emit("complaintResolved", payload);
      await notifyUser(
        io,
        complaint.citizen,
        "Complaint resolved",
        `${complaint.complaintId} has been resolved`,
        "COMPLAINT_RESOLVED",
      );
    }
    io?.to("role:admin").emit("complaintStatusUpdated", payload);
    await notifyUser(
      io,
      complaint.citizen,
      "Complaint status updated",
      `${complaint.complaintId} is now ${complaint.status.replaceAll("_", " ")}`,
      "STATUS_UPDATED",
    );
    ok(res, payload);
  }),
);
router.patch(
  "/:id/assign",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const worker = await Worker.findById(req.body.workerId);
    const complaint = await Complaint.findById(req.params.id);
    if (!worker || !complaint) return fail(res, 404, "Worker or complaint not found");
    complaint.assignedWorker = worker._id;
    complaint.status = "ASSIGNED";
    await complaint.save();
    await ComplaintHistory.create({
      complaint: complaint._id,
      status: "ASSIGNED",
      changedBy: req.user.id,
      comment: "Assigned to field worker",
    });
    const wUser = await (await import("../models/index.js")).User.findById(worker.user);
    const io = req.app.get("io");
    io?.to(`user:${worker.user}`).emit("complaintAssigned", shape(complaint));
    await notifyUser(
      io,
      worker.user,
      "New task assigned",
      `${complaint.complaintId} was assigned to you`,
      "COMPLAINT_ASSIGNED",
    );
    io?.to("role:admin").emit("complaintStatusUpdated", shape(complaint));
    ok(
      res,
      shape({ ...complaint.toObject(), assignedWorker: { ...worker.toObject(), user: wUser } }),
    );
  }),
);
router.post(
  "/:id/resolution",
  requireRole("worker"),
  upload.single("image"),
  asyncRoute(async (req, res) => {
    const worker = await Worker.findOne({ user: req.user.id });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, 404, "Complaint not found");
    if (String(complaint.assignedWorker) !== String(worker?._id))
      return fail(res, 403, "Task is not assigned to you");
    if (complaint.status !== "IN_PROGRESS")
      return fail(res, 422, "Start the task before marking it resolved");
    complaint.status = "RESOLVED";
    complaint.resolvedAt = new Date();
    complaint.resolutionComment = req.body.comment ?? req.body.resolution_note;
    complaint.resolutionImage = req.file
      ? publicFile(req.file)
      : (req.body.resolutionImageUrl ?? req.body.resolution_image_url);
    await complaint.save();
    await ComplaintHistory.create({
      complaint: complaint._id,
      status: "RESOLVED",
      changedBy: req.user.id,
      comment: req.body.comment || "Work completed",
    });
    const io = req.app.get("io");
    io?.to(`user:${complaint.citizen}`).emit("complaintResolved", shape(complaint));
    io?.to("role:admin").emit("complaintStatusUpdated", shape(complaint));
    await notifyUser(
      io,
      complaint.citizen,
      "Complaint resolved",
      `${complaint.complaintId} has been resolved`,
      "COMPLAINT_RESOLVED",
    );
    ok(res, shape(complaint));
  }),
);
router.patch(
  "/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const allowed = [
      "category",
      "severity",
      "severityScore",
      "title",
      "description",
      "address",
      "admin_notes",
    ];
    const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (patch.admin_notes !== undefined) {
      patch.adminNotes = patch.admin_notes;
      delete patch.admin_notes;
    }
    if (patch.category && !patch.severity) {
      const current = await Complaint.findById(req.params.id);
      if (!current) return fail(res, 404, "Complaint not found");
      Object.assign(
        patch,
        scoreSeverity({
          category: patch.category,
          confidence: current.aiConfidence,
          duplicateCount: current.duplicateCount,
        }),
      );
    }
    const row = await Complaint.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });
    if (!row) return fail(res, 404, "Complaint not found");
    ok(res, shape(row));
  }),
);
router.delete(
  "/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) return fail(res, 404, "Complaint not found");
    await ComplaintHistory.deleteMany({ complaint: complaint._id });
    ok(res, { deleted: true });
  }),
);
export default router;
