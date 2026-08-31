import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requirePermission("deposit", "list");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      balanceAgg,
      pendingWithdrawals,
      todayDeposits,
      todayWithdrawals,
      history,
    ] = await Promise.all([
      prisma.user.aggregate({
        _sum: { balance: true },
      }),

      prisma.withdrawalRequest.aggregate({
        where: { status: "PENDING" },
        _count: true,
        _sum: { amount: true },
      }),

      prisma.depositRequest.aggregate({
        where: {
          status: "VERIFIED",
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
        _count: true,
      }),

      prisma.withdrawalRequest.aggregate({
        where: {
          status: { in: ["APPROVED", "PAID"] },
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
        _count: true,
      }),

      prisma.$queryRaw<
        { date: string; deposits: bigint; withdrawals: bigint }[]
      >`
        SELECT
          TO_CHAR(d."createdAt", 'YYYY-MM-DD') AS date,
          COALESCE(SUM(CASE WHEN d."status" = 'VERIFIED' THEN d."amount" ELSE 0 END), 0) AS deposits,
          0 AS withdrawals
        FROM "DepositRequest" d
        WHERE d."createdAt" >= ${sevenDaysAgo}
        GROUP BY TO_CHAR(d."createdAt", 'YYYY-MM-DD')

        UNION ALL

        SELECT
          TO_CHAR(w."createdAt", 'YYYY-MM-DD') AS date,
          0 AS deposits,
          COALESCE(SUM(CASE WHEN w."status" IN ('APPROVED', 'PAID') THEN w."amount" ELSE 0 END), 0) AS withdrawals
        FROM "WithdrawalRequest" w
        WHERE w."createdAt" >= ${sevenDaysAgo}
        GROUP BY TO_CHAR(w."createdAt", 'YYYY-MM-DD')
        ORDER BY date ASC
      `,
    ]);

    const totalBalance = Number(balanceAgg._sum.balance ?? 0);
    const pendingCount = pendingWithdrawals._count;
    const pendingAmount = Number(pendingWithdrawals._sum.amount ?? 0);

    const dailyMap: Record<string, { deposits: number; withdrawals: number }> = {};
    for (const row of history) {
      if (!dailyMap[row.date]) {
        dailyMap[row.date] = { deposits: 0, withdrawals: 0 };
      }
      dailyMap[row.date].deposits += Number(row.deposits);
      dailyMap[row.date].withdrawals += Number(row.withdrawals);
    }

    const historyArray = Object.entries(dailyMap)
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return Response.json({
      snapshot: {
        totalBalance,
        userLiabilities: totalBalance,
        pendingWithdrawals: { count: pendingCount, amount: pendingAmount },
        dailyDeposits: {
          count: todayDeposits._count,
          amount: Number(todayDeposits._sum.amount ?? 0),
        },
        dailyWithdrawals: {
          count: todayWithdrawals._count,
          amount: Number(todayWithdrawals._sum.amount ?? 0),
        },
      },
      history: historyArray,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
