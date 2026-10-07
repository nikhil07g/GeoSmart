import path from "node:path";
import fs from "node:fs";
import multer from "multer";

export const uploadDirectory = path.resolve("server/uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_req, file, cb) =>
    cb(
      null,
      `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
    ),
});
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
export const datasetUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(
      null,
      [
        "application/zip",
        "application/x-zip-compressed",
        "text/csv",
        "application/vnd.ms-excel",
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.mimetype),
    ),
});
export const publicFile = (file) =>
  file
    ? `${process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/${path.basename(file.filename)}`
    : null;
