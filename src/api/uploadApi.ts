import { supabase } from "@/integrations/supabase/client";

const BUCKET = "waste-images";
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function validateImage(file: File) {
  if (!ALLOWED.includes(file.type)) return "Only JPG, PNG or WEBP images are allowed.";
  if (file.size > MAX_BYTES) return "Image must be smaller than 5 MB.";
  return null;
}

/**
 * Storage abstraction — swap this single module for Cloudinary/S3 later
 * without touching any component.
 */
export async function uploadImage(file: File, folder = "complaints") {
  const invalid = validateImage(file);
  if (invalid) throw new Error(invalid);

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError) throw new Error(signError.message);
  return { path, url: data.signedUrl };
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}
