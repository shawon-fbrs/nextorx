import { prisma } from "@/lib/db";
import { getSettlementBacklog, getSettlementStatus } from "@/lib/settlement-worker";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [backlog, settlement] = await Promise.all([
      getSettlementBacklog().catch(() => -1),
      Promise.resolve(getSettlementStatus()),
    ]);
    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      settlement: {
        backlog,
        paused: settlement.paused,
        lastRunAt: settlement.lastRunAt,
        lastSettled: settlement.lastSettled,
        lastError: settlement.lastError,
      },
    });
  } catch {
    return Response.json({ status: "error", error: "Database connection failed" }, { status: 503 });
  }
}
