import { api, uploadBody } from "@/api/api";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
export function validateImage(file: File) {
  if (!ALLOWED.includes(file.type)) return "Only JPG, PNG or WEBP images are allowed.";
  if (file.size > 10 * 1024 * 1024) return "Image must be smaller than 10 MB.";
  return null;
}
export async function uploadImage(file: File, _folder = "complaints") {
  const invalid = validateImage(file);
  if (invalid) throw new Error(invalid);
  return api<{ url: string; path: string }>("/uploads", {
    method: "POST",
    body: uploadBody({ image: file }),
  });
}
export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}
