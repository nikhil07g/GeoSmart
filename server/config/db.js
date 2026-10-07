import mongoose from "mongoose";
import { User } from "../models/index.js";

export async function connectDatabase() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);
  await User.updateMany({ role: { $exists: false } }, { $set: { role: "citizen" } });
  await User.updateMany({ status: { $exists: false }, active: false }, { $set: { status: "suspended" } });
  await User.updateMany({ status: { $exists: false } }, { $set: { status: "active" } });
  await User.updateMany({ active: { $exists: false } }, { $set: { active: true } });
  console.log("MongoDB connected");
}
