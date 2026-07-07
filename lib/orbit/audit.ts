import { db } from "@/lib/db";
import { platformAuditLog } from "@/lib/db/schema";

type AuditTargetType = "user" | "workspace" | "settings";

interface WriteAuditParams {
  actorId:    string;
  action:     string;
  targetType: AuditTargetType;
  targetId?:  string;
  metadata?:  Record<string, unknown>;
}

export async function writeAuditLog(params: WriteAuditParams) {
  await db.insert(platformAuditLog).values({
    actorId:    params.actorId,
    action:     params.action,
    targetType: params.targetType,
    targetId:   params.targetId ?? null,
    metadata:   params.metadata ?? null,
  });
}
