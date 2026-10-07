import { Notification, User } from "../models/index.js";
export async function notifyUser(io, user, title, message, type) {
  if (!user) return null;
  const notification = await Notification.create({ user, title, message, type });
  io?.to(`user:${user}`).emit("notificationCreated", notification);
  return notification;
}
export async function notifyAdmins(io, title, message, type) {
  const admins = await User.find({ role: "admin", active: true }).select("_id");
  const rows = await Notification.insertMany(
    admins.map((a) => ({ user: a._id, title, message, type })),
  );
  admins.forEach((a, i) => io?.to(`user:${a.id}`).emit("notificationCreated", rows[i]));
  io?.to("role:admin").emit("complaintCreated", { title, message, type });
}
