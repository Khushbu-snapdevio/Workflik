import path from "path";
import fs from "fs/promises";
import { env } from "@/lib/env";

function uploadDir(): string {
  return env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

// GET /api/uploads/files/[...path]  — serves local uploads in development
// In production (STORAGE_DRIVER=s3/r2) files are served directly from CDN.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if ((env.STORAGE_DRIVER ?? "local") !== "local") {
    return new Response("Not found", { status: 404 });
  }

  const { path: segments } = await params;
  const objectKey = segments.join("/");

  // Safety: prevent directory traversal
  const filePath = path.resolve(uploadDir(), objectKey);
  if (!filePath.startsWith(path.resolve(uploadDir()))) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    const ext    = path.extname(objectKey).slice(1).toLowerCase();

    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", gif: "image/gif",
      mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
      mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav",
      pdf: "application/pdf",
    };
    const contentType = mimeMap[ext] ?? "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
