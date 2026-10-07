import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

const { Schema, model, models } = mongoose;
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["citizen", "admin", "worker"], default: "citizen" },
    status: { type: String, enum: ["active", "pending", "suspended"], default: "active", index: true },
    phone: String,
    address: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
userSchema.pre("save", async function () {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function (value) {
  return bcrypt.compare(value, this.password);
};
export const User = models.User || model("User", userSchema);
const revokedTokenSchema = new Schema({
  fingerprint: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const RevokedToken = models.RevokedToken || model("RevokedToken", revokedTokenSchema);
export const tokenFingerprint = (token) => createHash("sha256").update(token).digest("hex");

const workerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeId: { type: String, unique: true },
    department: { type: String, default: "Sanitation" },
    availability: { type: String, enum: ["AVAILABLE", "BUSY", "OFFLINE"], default: "AVAILABLE" },
    currentLocation: { type: [Number], default: undefined },
  },
  { timestamps: true },
);
export const Worker = models.Worker || model("Worker", workerSchema);

const complaintSchema = new Schema(
  {
    complaintId: { type: String, unique: true },
    citizen: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: String,
    imageUrl: String,
    extraImageUrl: String,
    category: { type: String, default: "Mixed Waste" },
    aiCategory: String,
    aiConfidence: Number,
    aiRawClass: String,
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    severityScore: { type: Number, default: 30 },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    latitude: Number,
    longitude: Number,
    address: String,
    status: {
      type: String,
      enum: ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    assignedWorker: { type: Schema.Types.ObjectId, ref: "Worker" },
    duplicateOf: { type: Schema.Types.ObjectId, ref: "Complaint" },
    duplicateCount: { type: Number, default: 0 },
    resolutionImage: String,
    resolutionComment: String,
    adminNotes: String,
    resolvedAt: Date,
  },
  { timestamps: true },
);
complaintSchema.pre("validate", function () {
  if (!this.complaintId)
    this.complaintId = `GS-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 5).toUpperCase()}`;
});
complaintSchema.index({ location: "2dsphere" });
export const Complaint = models.Complaint || model("Complaint", complaintSchema);

const historySchema = new Schema(
  {
    complaint: { type: Schema.Types.ObjectId, ref: "Complaint", index: true },
    status: String,
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    comment: String,
  },
  { timestamps: true },
);
export const ComplaintHistory = models.ComplaintHistory || model("ComplaintHistory", historySchema);
const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: String,
    message: String,
    type: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const Notification = models.Notification || model("Notification", notificationSchema);
const hotspotSchema = new Schema({
  latitude: Number,
  longitude: Number,
  complaintCount: Number,
  severityScore: Number,
  radius: Number,
  location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
  updatedAt: { type: Date, default: Date.now },
});
hotspotSchema.index({ location: "2dsphere" });
export const Hotspot = models.Hotspot || model("Hotspot", hotspotSchema);
const datasetSchema = new Schema(
  {
    name: String,
    description: String,
    fileUrl: String,
    fileType: String,
    numClasses: Number,
    numImages: Number,
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
export const Dataset = models.Dataset || model("Dataset", datasetSchema);
const routeSchema = new Schema(
  {
    worker: { type: Schema.Types.ObjectId, ref: "Worker" },
    complaints: [{ type: Schema.Types.ObjectId, ref: "Complaint" }],
    orderedComplaints: [Schema.Types.Mixed],
    routeCoordinates: [[Number]],
    distance: Number,
    estimatedDuration: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
export const Route = models.Route || model("Route", routeSchema);
export const TrainingJob =
  models.TrainingJob ||
  model(
    "TrainingJob",
    new Schema(
      {
        dataset: { type: Schema.Types.ObjectId, ref: "Dataset" },
        status: {
          type: String,
          enum: ["NOT_STARTED", "QUEUED", "TRAINING", "COMPLETED", "FAILED"],
          default: "NOT_STARTED",
        },
        requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
        startedAt: Date,
        completedAt: Date,
        error: String,
      },
      { timestamps: true },
    ),
  );
