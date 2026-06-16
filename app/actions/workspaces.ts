"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces, workspaceStorageUsage } from "@/lib/db/schema";
import { uniqueSlug } from "@/lib/workspaces/auth";

export async function createWorkspaceAction(formData: FormData) {
  const session = await requireSession();
  const name = (formData.get("name") as string)?.trim();
  const kind = (formData.get("kind") as string) === "team" ? "team" : "personal";
  if (!name) return;

  const slug = await uniqueSlug(name);

  const workspace = await db.transaction(async (tx) => {
    const [ws] = await tx
      .insert(workspaces)
      .values({ name, slug, kind, createdBy: session.user.id })
      .returning();

    await tx.insert(workspaceStorageUsage).values({ workspaceId: ws.id });

    await tx.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId:      session.user.id,
      role:        "admin",
      status:      "active",
      joinedAt:    new Date(),
    });

    return ws;
  });

  redirect(`/workspaces/setup/${workspace.slug}`);
}
