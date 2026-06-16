import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import type { WorkspaceRole } from "@/lib/permissions/resolver";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function apiError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "Unauthorized");
  return session;
}

export async function getWorkspaceMember(
  workspaceId: string,
  userId: string
) {
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, "active")
      )
    )
    .limit(1);
  return member ?? null;
}

export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole = "viewer"
) {
  const member = await getWorkspaceMember(workspaceId, userId);
  if (!member) throw new ApiError(403, "Not a member of this workspace");

  const roleRank: Record<WorkspaceRole, number> = { viewer: 0, editor: 1, admin: 2 };
  if (roleRank[member.role] < roleRank[minRole]) {
    throw new ApiError(403, "Insufficient role");
  }
  return member;
}

export async function getWorkspace(workspaceId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new ApiError(404, "Workspace not found");
  return workspace;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    || "workspace";
}

export async function uniqueSlug(base: string): Promise<string> {
  let candidate = slugify(base);
  let suffix = 0;
  while (true) {
    const slug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);
    if (!existing) return slug;
    suffix++;
  }
}

export function withErrorHandler(
  fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>
) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return apiError(err.status, err.message);
      console.error(err);
      return apiError(500, "Internal server error");
    }
  };
}
