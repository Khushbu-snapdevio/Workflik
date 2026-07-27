import { and, eq, or, type SQL } from "drizzle-orm";
import { notifications } from "@/lib/db/schema";

// A workspace invite is inherently about a workspace the recipient isn't an
// active member of yet — its own sidebar/notification bell for that
// workspace doesn't exist for them to check. So unlike every other
// notification type (scoped to whichever workspace is currently open),
// "workspace_invite" rows must stay visible no matter which of the
// recipient's *other* workspaces they currently have open, or they'd have no
// way to ever see the invite in-app at all.
export function notificationScope(recipientId: string, workspaceId: string): SQL {
  return and(
    eq(notifications.recipientId, recipientId),
    or(
      eq(notifications.workspaceId, workspaceId),
      eq(notifications.type, "workspace_invite"),
    ),
  )!;
}
