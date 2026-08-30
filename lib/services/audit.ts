import { prisma } from "@/lib/db";

export async function logAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, unknown>,
  ipAddress?: string,
) {
  return prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
      ipAddress,
    },
  });
}
