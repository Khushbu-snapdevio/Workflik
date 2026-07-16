import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";

// Long-poll interval: poll every 4s (snappier than the notifications stream's
// 10s — this is a single indexed MAX() aggregate, not a row fetch), keeping
// the connection alive with heartbeats every 25s. Same persistent-connection
// requirement as app/api/notifications/stream/route.ts — the client
// (usePageTreeStream) auto-reconnects if the host tears down idle connections.
const POLL_INTERVAL_MS = 4_000;
const HEARTBEAT_MS     = 25_000;
const MAX_DURATION_MS  = 55_000;

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/workspaces/:id/pages/stream
// Pushes a "changed" event whenever any page in the workspace is created,
// renamed, moved, or (soft-)deleted — every one of those already bumps
// pages.updated_at via the updatedAt() column helper, so this only needs to
// watch MAX(updated_at) rather than track individual mutations. The client
// reacts by doing a full tree refetch (same as the existing same-tab
// pages:refresh path) — no payload is sent, the event is just a nudge.
export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id: workspaceId } = await params;
    const session = await getSession();
    await requireWorkspaceMember(workspaceId, session.user.id);

    const encoder = new TextEncoder();

    async function currentMax(): Promise<number> {
      const [row] = await db
        .select({ maxUpdated: sql<string | null>`max(${pages.updatedAt})` })
        .from(pages)
        .where(eq(pages.workspaceId, workspaceId));
      return row?.maxUpdated ? new Date(row.maxUpdated).getTime() : 0;
    }

    let lastMax = await currentMax();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            // client disconnected
          }
        };

        send("connected", { ok: true });

        const deadline = Date.now() + MAX_DURATION_MS;
        let heartbeatTimer: ReturnType<typeof setTimeout> | undefined;

        const heartbeat = () => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch { /* client gone */ }
          if (Date.now() < deadline) heartbeatTimer = setTimeout(heartbeat, HEARTBEAT_MS);
        };
        heartbeatTimer = setTimeout(heartbeat, HEARTBEAT_MS);

        const poll = async () => {
          if (req.signal.aborted || Date.now() >= deadline) {
            clearTimeout(heartbeatTimer);
            try { controller.close(); } catch { /* already closed */ }
            return;
          }

          try {
            const max = await currentMax();
            if (max !== lastMax) {
              lastMax = max;
              send("changed", { ok: true });
            }
          } catch {
            // DB error — keep streaming, retry next poll
          }

          setTimeout(poll, POLL_INTERVAL_MS);
        };

        setTimeout(poll, POLL_INTERVAL_MS);

        req.signal.addEventListener("abort", () => {
          clearTimeout(heartbeatTimer);
          try { controller.close(); } catch { /* ok */ }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error("[GET /api/workspaces/:id/pages/stream]", err);
    return apiError(500, "Internal error");
  }
}
