import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requirePermission("user", "list");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      todayTrades,
      tradeStats,
      monthlyRevenue,
      topAssets,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.trade.count({
        where: { createdAt: { gte: todayStart } },
      }),

      prisma.trade.groupBy({
        by: ["status"],
        where: { status: { in: ["WON", "LOST"] } },
        _count: true,
        _sum: { amount: true, profit: true },
      }),

      prisma.$queryRaw<
        { month: string; revenue: bigint; trades: bigint }[]
      >`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN "status" = 'LOST' THEN "amount" ELSE 0 END)
                 - SUM(CASE WHEN "status" = 'WON' THEN COALESCE("profit", 0) ELSE 0 END), 0) AS revenue,
          COUNT(*)::bigint AS trades
        FROM "Trade"
        WHERE "status" IN ('WON', 'LOST')
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `,

      prisma.$queryRaw<
        { name: string; trades: bigint; volume: bigint; winRate: number }[]
      >`
        SELECT
          p."name",
          COUNT(t."id")::bigint AS trades,
          COALESCE(SUM(t."amount"), 0)::bigint AS volume,
          CASE WHEN COUNT(t."id") > 0
            THEN ROUND(COUNT(t."id") FILTER (WHERE t."status" = 'WON')::numeric / COUNT(t."id")::numeric * 100, 1)
            ELSE 0
          END AS "winRate"
        FROM "Trade" t
        JOIN "Pair" p ON p."id" = t."pairId"
        WHERE t."status" IN ('WON', 'LOST')
        GROUP BY p."id", p."name"
        ORDER BY volume DESC
        LIMIT 10
      `,
    ]);

    const won = tradeStats.find((r) => r.status === "WON");
    const lost = tradeStats.find((r) => r.status === "LOST");
    const wonCount = won?._count ?? 0;
    const lostCount = lost?._count ?? 0;
    const settledTrades = wonCount + lostCount;
    const stakesKept = Number(lost?._sum.amount ?? 0);
    const payouts = Number(won?._sum.profit ?? 0);
    const totalVolume = stakesKept + Number(won?._sum.amount ?? 0);
    const gross = stakesKept - payouts;

    return Response.json({
      totalUsers,
      todayTrades,
      totalRevenue: gross,
      totalVolume,
      winRate: settledTrades > 0
        ? Number(((wonCount / settledTrades) * 100).toFixed(1))
        : 0,
      settledTrades,
      monthlyRevenue: monthlyRevenue.map((r) => ({
        date: r.month,
        revenue: Number(r.revenue),
        trades: Number(r.trades),
      })),
      topAssets: topAssets.map((a) => ({
        name: a.name,
        trades: Number(a.trades),
        volume: Number(a.volume),
        winRate: Number(a.winRate),
      })),
    });
  } catch (e) {
    return toJsonError(e);
  }
}
