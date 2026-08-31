import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requirePermission("audit", "read");

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });

    return Response.json({
      logs: logs.map((log) => ({
        id: log.id,
        actorId: log.actorId,
        actorName: log.actor?.name ?? null,
        actorEmail: log.actor?.email ?? null,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        meta: log.meta,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return toJsonError(e);
  }
}
