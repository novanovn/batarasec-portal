import { db } from "@/db";
import { portalAuditLog } from "@/db/schema";
import { createId } from "@/lib/ids";

type AuditInput = {
  actor: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await db.insert(portalAuditLog).values({
    id: createId("aud"),
    actor: input.actor,
    action: input.action,
    target: input.target,
    metadata: input.metadata,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}
