import { NextRequest } from "next/server";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("deposit", "list");
    const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days") ?? 30), 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [dailyTrades, dailyFlows, byPair] = await Promise.all([
      prisma.$queryRaw<
        { date: string; trades: number; volume: bigint; stakesKept: bigint; payouts: bigint }[]
      >`
        SELECT TO_CHAR("settledAt", 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS trades,
          COALESCE(SUM("amount"), 0)::bigint AS volume,
          COALESCE(SUM(CASE WHEN "status" = 'LOST' THEN "amount" ELSE 0 END), 0)::bigint AS "stakesKept",
          COALESCE(SUM(CASE WHEN "status" = 'WON' THEN COALESCE("profit", 0) ELSE 0 END), 0)::bigint AS payouts
        FROM "Trade"
        WHERE "settledAt" >= ${since} AND "status" IN ('WON', 'LOST')
        GROUP BY TO_CHAR("settledAt", 'YYYY-MM-DD')
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ date: string; deposits: bigint; withdrawals: bigint }[]>`
        SELECT
          TO_CHAR(d."createdAt", 'YYYY-MM-DD') AS date,
          COALESCE(SUM(CASE WHEN d."status" = 'VERIFIED' THEN d."amount" ELSE 0 END), 0)::bigint AS deposits,
          0::bigint AS withdrawals
        FROM "DepositRequest" d
        WHERE d."createdAt" >= ${since}
        GROUP BY TO_CHAR(d."createdAt", 'YYYY-MM-DD')
        UNION ALL
        SELECT
          TO_CHAR(w."createdAt", 'YYYY-MM-DD') AS date,
          0::bigint AS deposits,
          COALESCE(SUM(CASE WHEN w."status" IN ('APPROVED', 'PAID') THEN w."amount" ELSE 0 END), 0)::bigint AS withdrawals
        FROM "WithdrawalRequest" w
        WHERE w."createdAt" >= ${since}
        GROUP BY TO_CHAR(w."createdAt", 'YYYY-MM-DD')
        ORDER BY date ASC
      `,
      prisma.$queryRaw<
        { pairId: string; pairName: string; trades: number; volume: bigint; stakesKept: bigint; payouts: bigint }[]
      >`
        SELECT t."pairId" AS "pairId", p."name" AS "pairName",
          COUNT(*)::int AS trades,
          COALESCE(SUM(t."amount"), 0)::bigint AS volume,
          COALESCE(SUM(CASE WHEN t."status" = 'LOST' THEN t."amount" ELSE 0 END), 0)::bigint AS "stakesKept",
          COALESCE(SUM(CASE WHEN t."status" = 'WON' THEN COALESCE(t."profit", 0) ELSE 0 END), 0)::bigint AS payouts
        FROM "Trade" t
        JOIN "Pair" p ON p."id" = t."pairId"
        WHERE t."settledAt" >= ${since} AND t."status" IN ('WON', 'LOST')
        GROUP BY t."pairId", p."name"
        ORDER BY volume DESC
      `,
    ]);

    const dayMap: Record<string, { deposits: number; withdrawals: number }> = {};
    for (const row of dailyFlows) {
      dayMap[row.date] ??= { deposits: 0, withdrawals: 0 };
      dayMap[row.date].deposits += Number(row.deposits);
      dayMap[row.date].withdrawals += Number(row.withdrawals);
    }

    const daily = dailyTrades.map((row) => {
      const stakesKept = Number(row.stakesKept);
      const payouts = Number(row.payouts);
      return {
        date: row.date,
        trades: row.trades,
        volume: Number(row.volume),
        stakesKept,
        payouts,
        gross: stakesKept - payouts,
        deposits: dayMap[row.date]?.deposits ?? 0,
        withdrawals: dayMap[row.date]?.withdrawals ?? 0,
      };
    });

    const totals = daily.reduce(
      (acc, d) => ({
        trades: acc.trades + d.trades,
        volume: acc.volume + d.volume,
        stakesKept: acc.stakesKept + d.stakesKept,
        payouts: acc.payouts + d.payouts,
        gross: acc.gross + d.gross,
        deposits: acc.deposits + d.deposits,
        withdrawals: acc.withdrawals + d.withdrawals,
      }),
      { trades: 0, volume: 0, stakesKept: 0, payouts: 0, gross: 0, deposits: 0, withdrawals: 0 },
    );

    return Response.json({
      days,
      daily,
      byPair: byPair.map((r) => ({
        pairId: r.pairId,
        pairName: r.pairName,
        trades: r.trades,
        volume: Number(r.volume),
        stakesKept: Number(r.stakesKept),
        payouts: Number(r.payouts),
        gross: Number(r.stakesKept) - Number(r.payouts),
      })),
      totals,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
