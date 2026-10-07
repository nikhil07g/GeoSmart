import jwt from "jsonwebtoken";
import { RevokedToken, User, tokenFingerprint } from "../models/index.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
    if (await RevokedToken.exists({ fingerprint: tokenFingerprint(token) }))
      return res.status(401).json({ success: false, message: "Token has been revoked" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active)
      return res.status(401).json({ success: false, message: "Account unavailable" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ success: false, message: "Insufficient permissions" });
