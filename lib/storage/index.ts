import type { StorageDriver } from "./drivers/types";
export type { StorageDriver, UploadSlot } from "./drivers/types";

let _driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (_driver) return _driver;

  const driver = process.env.STORAGE_DRIVER ?? "local";

  if (driver === "s3" || driver === "r2") {
    const { createS3Driver } = require("./drivers/s3") as typeof import("./drivers/s3");
    _driver = createS3Driver();
  } else {
    const { createLocalDriver } = require("./drivers/local") as typeof import("./drivers/local");
    _driver = createLocalDriver();
  }

  return _driver!;
}

/** Per-kind size limits in bytes. Enforced at the presign step. */
export const SIZE_LIMITS: Record<string, number> = {
  page_cover:     5  * 1024 * 1024,   //   5 MB
  page_icon:      1  * 1024 * 1024,   //   1 MB
  user_avatar:    1  * 1024 * 1024,   //   1 MB
  workspace_icon: 1  * 1024 * 1024,   //   1 MB
  block_media:   100 * 1024 * 1024,   // 100 MB ceiling (per-mime enforced below)
};

/** Per-mime caps that apply within block_media. */
export const BLOCK_MEDIA_MIME_LIMITS: Record<string, number> = {
  "image/jpeg":       10 * 1024 * 1024,
  "image/png":        10 * 1024 * 1024,
  "image/webp":       10 * 1024 * 1024,
  "image/gif":        10 * 1024 * 1024,
  "video/mp4":        50 * 1024 * 1024,
  "video/webm":       50 * 1024 * 1024,
  "video/quicktime":  50 * 1024 * 1024,
  "audio/mpeg":       50 * 1024 * 1024,
  "audio/ogg":        50 * 1024 * 1024,
  "audio/wav":        50 * 1024 * 1024,
  "audio/mp4":        50 * 1024 * 1024,
};

/** Allowed MIME types for image-only kinds. */
export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);

export const WORKSPACE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
