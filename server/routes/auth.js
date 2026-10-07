import { Router } from "express";
import jwt from "jsonwebtoken";
import { RevokedToken, User, Worker, tokenFingerprint } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncRoute, ok, fail } from "../utils/response.js";
const router = Router();
const tokenFor = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = (u) => ({
  id: u.id,
  user_id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
  address: u.address,
  active: u.active,
});
router.post(
  "/register",
  asyncRoute(async (req, res) => {
    const { name, email, password, phone, address } = req.body;
    if (
      !name?.trim() ||
      !email ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !password ||
      password.length < 8
    )
      return fail(res, 422, "Enter a name, valid email and password of at least 8 characters");
    if (await User.exists({ email: email.toLowerCase() }))
      return fail(res, 409, "An account with this email already exists");
    const user = await User.create({
      name: name.trim(),
      email,
      password,
      phone,
      address,
      role: "citizen",
    });
    const safe = publicUser(user);
    ok(
      res,
      { token: tokenFor(user), user: safe, profile: safe, role: user.role, worker: null },
      201,
    );
  }),
);
router.post(
  "/login",
  asyncRoute(async (req, res) => {
    const user = await User.findOne({ email: String(req.body.email ?? "").toLowerCase() }).select(
      "+password",
    );
    if (!user || !user.active || !(await user.comparePassword(req.body.password ?? "")))
      return fail(res, 401, "Email or password is incorrect");
    const worker = user.role === "worker" ? await Worker.findOne({ user: user.id }) : null;
    const safe = publicUser(user);
    ok(res, {
      token: tokenFor(user),
      user: safe,
      profile: safe,
      role: user.role,
      worker: worker
        ? {
            id: worker.id,
            user_id: user.id,
            name: user.name,
            employee_id: worker.employeeId,
            department: worker.department,
            availability: worker.availability,
          }
        : null,
    });
  }),
);
router.get(
  "/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    const worker = req.user.role === "worker" ? await Worker.findOne({ user: req.user.id }) : null;
    const safe = publicUser(req.user);
    ok(res, { user: safe, profile: safe, role: req.user.role, worker });
  }),
);
router.patch(
  "/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { name, phone, address } = req.body;
    if (name !== undefined) req.user.name = String(name).trim();
    if (phone !== undefined) req.user.phone = phone;
    if (address !== undefined) req.user.address = address;
    await req.user.save();
    const safe = publicUser(req.user);
    ok(res, { user: safe, profile: safe, role: req.user.role });
  }),
);
router.post(
  "/logout",
  requireAuth,
  asyncRoute(async (req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      const claims = jwt.decode(token);
      await RevokedToken.updateOne(
        { fingerprint: tokenFingerprint(token) },
        {
          $set: {
            expiresAt: new Date((claims?.exp ?? Math.floor(Date.now() / 1000) + 604800) * 1000),
          },
        },
        { upsert: true },
      );
    }
    ok(res, { message: "Signed out" });
  }),
);
export default router;
