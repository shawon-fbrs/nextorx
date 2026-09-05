import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requirePermission("trade", "list");

    const rows = await prisma.trade.groupBy({
      by: ["pairId", "direction"],
      where: { status: "ACTIVE" },
      _count: true,
      _sum: { amount: true },
    });

    const pairIds = [...new Set(rows.map((r) => r.pairId))];
    const pairs = pairIds.length > 0
      ? await prisma.pair.findMany({
          where: { id: { in: pairIds } },
          select: { id: true, name: true, payoutPercent: true },
        })
      : [];
    const pairMap = new Map(pairs.map((p) => [p.id, p]));

    const byPair = new Map<string, {
      pairId: string;
      pairName: string;
      up: number;
      down: number;
      upCount: number;
      downCount: number;
    }>();
    for (const r of rows) {
      const entry = byPair.get(r.pairId) ?? {
        pairId: r.pairId,
        pairName: pairMap.get(r.pairId)?.name ?? r.pairId,
        up: 0,
        down: 0,
        upCount: 0,
        downCount: 0,
      };
      const amount = r._sum.amount ?? 0;
      if (r.direction === "UP") {
        entry.up += amount;
        entry.upCount += r._count;
      } else {
        entry.down += amount;
        entry.downCount += r._count;
      }
      byPair.set(r.pairId, entry);
    }

    const exposure = [...byPair.values()].map((e) => ({
      ...e,
      net: e.up - e.down,
      total: e.up + e.down,
      count: e.upCount + e.downCount,
    })).sort((a, b) => b.total - a.total);

    const totals = exposure.reduce(
      (acc, e) => ({ up: acc.up + e.up, down: acc.down + e.down, count: acc.count + e.count }),
      { up: 0, down: 0, count: 0 },
    );

    return Response.json({ exposure, totals });
  } catch (e) {
    return toJsonError(e);
  }
}
