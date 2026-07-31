import { env } from "@/lib/env";
import { ApiError, apiError, getSession } from "@/lib/workspaces/auth";

// GET /api/attachments/download?url=&name=
// Proxies a comment/entry attachment through our own server so the browser
// never makes the request cross-origin. A plain `<a href download>` (or a
// client-side `fetch()`) pointed straight at an S3/CDN-hosted attachment
// (lib/storage/drivers/s3.ts's getPublicUrl serves from a separate CDN host)
// depends on that host either being same-origin or sending permissive CORS
// headers — browsers silently ignore `download` for a cross-origin link,
// and block a cross-origin `fetch()` outright if CORS isn't configured.
// Fetching it here instead is a server-to-server request, which CORS (a
// browser-only mechanism) never applies to — then this response's own
// same-origin Content-Disposition header reliably forces the download
// regardless of the storage host's CORS setup.
function isAllowedHost(url: string): boolean {
  try {
    const target = new URL(url);
    const allowedBases = [env.NEXT_PUBLIC_APP_URL, env.CDN_URL].filter(
      Boolean
    ) as string[];
    return allowedBases.some((base) => new URL(base).host === target.host);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    await getSession();

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const name = (searchParams.get("name") ?? "download").replace(
      /["\r\n]/g,
      ""
    );
    if (!url || !isAllowedHost(url)) {
      return apiError(400, "Invalid attachment url");
    }

    const upstream = await fetch(url);
    if (!upstream.ok) {
      return apiError(502, "Failed to fetch attachment");
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return apiError(err.status, err.message);
    }
    console.error("[attachments/download]", err);
    return apiError(500, "Internal server error");
  }
}
