import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
/** Signed links stay valid for ~10 years; files live in private storage. */
export const LONG_LIVED_SECONDS = 60 * 60 * 24 * 365 * 10;

export function validateFile(file: File, kind: "video" | "image" | "avatar"): string | null {
  const types = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  const max = kind === "video" ? MAX_VIDEO_BYTES : kind === "image" ? MAX_IMAGE_BYTES : MAX_AVATAR_BYTES;
  if (!types.includes(file.type)) {
    return kind === "video" ? "Lejohen vetëm video MP4, WebM ose MOV." : "Lejohen vetëm imazhe JPG, PNG ose WebP.";
  }
  if (file.size > max) {
    return `Skedari është shumë i madh (maksimumi ${Math.round(max / 1024 / 1024)} MB).`;
  }
  return null;
}

function extFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type.split("/")[1] ?? "bin";
}

export function buildPath(prefix: string, file: File): string {
  return `${prefix}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extFor(file)}`;
}

/** Resumable upload with progress; each chunk is small so big videos upload reliably. */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Seanca ka skaduar. Hyr përsëri.");
  const baseUrl = import.meta.env["VITE_SUPABASE_URL"] as string;
  const apiKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${baseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1500, 4000, 10000],
      headers: { authorization: `Bearer ${token}`, apikey: apiKey, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType: file.type, cacheControl: "31536000" },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (sent, total) => onProgress(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

/**
 * Shrinks a cover image before upload (max 1600px wide, WebP) so pages load fast.
 * Falls back to the original file if the browser can't convert it.
 */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function signedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, LONG_LIVED_SECONDS);
  if (error || !data) throw new Error("Lidhja e skedarit nuk u krijua.");
  return data.signedUrl;
}

/**
 * Moves an episode video to a fresh file name so every play link shared
 * while it was published stops working once it is hidden.
 */
export async function rotateVideoPath(oldPath: string): Promise<string> {
  const ext = oldPath.split(".").pop() ?? "mp4";
  const next = `episodes/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage.from("episode-videos").move(oldPath, next);
  if (error) throw new Error("Videoja nuk u fsheh.");
  return next;
}

/** Reads the duration of a local video file in seconds (best effort). */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
