import "dotenv/config";
import { connectDatabase } from "./config/db.js";
import { User, Worker, Complaint, ComplaintHistory, Notification, Route } from "./models/index.js";

await connectDatabase();
const accounts = [
  {
    name: "GeoSmart Administrator",
    email: "admin@geosmart.local",
    password: "GeoSmartAdmin2026!",
    role: "admin",
  },
  ...Array.from({ length: 5 }, (_, i) => ({
    name: ["Aarav Sharma", "Priya Nair", "Rohan Mehta", "Ananya Rao", "Kabir Das"][i],
    email: `worker${i + 1}@geosmart.local`,
    password: "GeoSmartDemo2026!",
    role: "worker",
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    name: `Citizen ${i + 1}`,
    email: `citizen${i + 1}@geosmart.local`,
    password: "GeoSmartDemo2026!",
    role: "citizen",
  })),
];
const users = [];
for (const entry of accounts) {
  let user = await User.findOne({ email: entry.email });
  if (!user) user = await User.create(entry);
  users.push(user);
}
const workerUsers = users.filter((x) => x.role === "worker");
for (let i = 0; i < workerUsers.length; i++) {
  await Worker.updateOne(
    { user: workerUsers[i]._id },
    {
      $setOnInsert: {
        user: workerUsers[i]._id,
        employeeId: `GS-W-${String(i + 1).padStart(3, "0")}`,
        department: "City Sanitation",
        availability: "AVAILABLE",
        currentLocation: [78.4867 + i * 0.01, 17.385 + i * 0.008],
      },
    },
    { upsert: true },
  );
}
if ((await Complaint.countDocuments()) === 0) {
  const citizens = users.filter((x) => x.role === "citizen"),
    cats = [
      "Plastic Waste",
      "Organic Waste",
      "E-Waste",
      "Construction Waste",
      "Glass Waste",
      "Paper Waste",
      "Metal Waste",
      "Mixed Waste",
      "Illegal Dumping",
    ];
  const statuses = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "PENDING"];
  for (let i = 0; i < 24; i++) {
    const latitude = 17.385 + ((i % 6) - 2.5) * 0.012,
      longitude = 78.4867 + (Math.floor(i / 6) - 1.5) * 0.014,
      status = statuses[i % statuses.length],
      createdAt = new Date(Date.now() - (i * 7 + 2) * 3600000),
      worker =
        status !== "PENDING"
          ? await Worker.findOne({ user: workerUsers[i % workerUsers.length]._id })
          : null;
    const complaint = await Complaint.create({
      citizen: citizens[i % citizens.length]._id,
      title: `${cats[i % cats.length]} near ${["Central Market", "Lake Road", "Sector 12", "Bus Station"][i % 4]}`,
      description: "Demo report seeded for local development.",
      imageUrl: null,
      category: cats[i % cats.length],
      aiCategory: cats[i % cats.length],
      aiConfidence: 78,
      latitude,
      longitude,
      location: { type: "Point", coordinates: [longitude, latitude] },
      address: ["Central Market", "Lake Road", "Sector 12", "Bus Station"][i % 4],
      severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"][i % 4],
      severityScore: [22, 48, 69, 88][i % 4],
      status,
      assignedWorker: worker?._id,
      createdAt,
      resolvedAt: status === "RESOLVED" ? new Date(createdAt.getTime() + 8 * 3600000) : undefined,
    });
    await ComplaintHistory.create({
      complaint: complaint._id,
      status: "PENDING",
      changedBy: citizens[i % citizens.length]._id,
      comment: "Complaint submitted",
      createdAt,
    });
    if (status !== "PENDING")
      await ComplaintHistory.create({
        complaint: complaint._id,
        status,
        changedBy: users[0]._id,
        comment: "Seeded demo status",
        createdAt: new Date(createdAt.getTime() + 3600000),
      });
  }
}
const admin = users.find((x) => x.role === "admin");
if (!(await Notification.exists({ user: admin._id })))
  await Notification.create({
    user: admin._id,
    title: "Welcome to GeoSmart",
    message: "Demo data is ready for local exploration.",
    type: "SYSTEM",
  });
for (const citizen of users.filter((x) => x.role === "citizen")) {
  if (!(await Notification.exists({ user: citizen._id })))
    await Notification.create({
      user: citizen._id,
      title: "Welcome to GeoSmart",
      message: "Your account is ready. You can submit and track city waste reports here.",
      type: "SYSTEM",
    });
}
if (!(await Route.exists())) {
  const worker = await Worker.findOne();
  const stops = await Complaint.find({
    assignedWorker: worker._id,
    status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
  }).limit(3);
  if (stops.length) {
    const coordinates = [[17.385, 78.4867], ...stops.map((c) => [c.latitude, c.longitude])];
    await Route.create({
      worker: worker._id,
      complaints: stops.map((c) => c._id),
      orderedComplaints: stops.map((c, i) => ({
        id: c.id,
        title: c.title,
        lat: c.latitude,
        lng: c.longitude,
        order: i + 1,
      })),
      routeCoordinates: coordinates,
      distance: 4.2,
      estimatedDuration: 28,
      createdBy: admin._id,
    });
  }
}
console.log(
  "Seed complete. Admin: admin@geosmart.local / GeoSmartAdmin2026! | Worker: worker1@geosmart.local / GeoSmartDemo2026! | Citizen: citizen1@geosmart.local / GeoSmartDemo2026!",
);
process.exit(0);
