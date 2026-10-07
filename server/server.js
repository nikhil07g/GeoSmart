import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import jwt from "jsonwebtoken";
import { User } from "./models/index.js";

const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24)
  throw new Error("Set JWT_SECRET to a random secret of at least 24 characters");
await connectDatabase();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL?.split(",") ?? "http://localhost:5173" },
});
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(claims.sub).select("_id role");
    if (!user) return next(new Error("Unauthorized"));
    socket.data.userId = user.id;
    socket.data.role = user.role;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});
io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
  socket.join(`role:${socket.data.role}`);
});
app.set("io", io);
server.listen(port, () => console.log(`GeoSmart API listening on http://localhost:${port}`));
process.on("SIGINT", () => server.close(() => process.exit(0)));
