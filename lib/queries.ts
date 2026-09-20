import { prisma } from "@/lib/db";
import { requireUser, getSessionUser } from "@/lib/api";
import { isAdminRole } from "@/lib/dal";
import { getSettings, SETTING_DEFAULTS } from "@/lib/settings";
import { getVaultSnapshot } from "@/lib/vault";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
    redirect("/login");
  }
  return user;
}

async function requireAuth() {
  try {
    return await requireUser();
  } catch {
    redirect("/login");
  }
}

export async function getAdminDashboardStats() {
  await requireAdmin();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalUsers, todayTrades, tradeStats, monthlyRevenue, topAssets] =
    await Promise.all([
      prisma.user.count(),
      prisma.trade.count({ where: { createdAt: { gte: todayStart } } }),
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

  return {
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
  };
}

export async function getAdminUsers(params?: { q?: string; limit?: number }) {
  await requireAdmin();
  const q = params?.q ?? "";
  const limit = Math.min(params?.limit ?? 200, 200);

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { referralCode: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      uid: true,
      name: true,
      email: true,
      role: true,
      balance: true,
      bonusBalance: true,
      kycStatus: true,
      banned: true,
      referralCode: true,
      createdAt: true,
      _count: { select: { ledgerEntries: true, deposits: true, withdrawals: true, trades: true } },
    },
  });

  return { users };
}

export async function getAdminUserDetail(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      balance: true,
      bonusBalance: true,
      kycStatus: true,
      banned: true,
      banReason: true,
      banExpires: true,
      twoFactorEnabled: true,
      depositLimitDaily: true,
      referralCode: true,
      phone: true,
      country: true,
      createdAt: true,
      _count: { select: { ledgerEntries: true, deposits: true, withdrawals: true, trades: true } },
    },
  });

  if (!user) return null;

  const [trades, sessions, kyc, exclusion] = await Promise.all([
    prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { pair: { select: { name: true } } },
    }),
    prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
    }),
    prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, tier: true, idType: true, status: true, createdAt: true },
    }),
    prisma.selfExclusion.findUnique({ where: { userId } }),
  ]);

  return { user, trades, sessions, kyc, exclusion };
}

export async function getAdminTrades(params?: { status?: string; limit?: number }) {
  await requireAdmin();
  const limit = Math.min(params?.limit ?? 500, 500);
  const status = params?.status;

  const trades = await prisma.trade.findMany({
    where: status ? { status: status as "ACTIVE" } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      pair: { select: { id: true, name: true, category: true } },
      user: { select: { id: true, name: true, email: true, uid: true } },
    },
  });

  return {
    trades: trades.map((t) => ({
      ...t,
      payoutPercent: t.payoutPercent.toString(),
      openPrice: t.openPrice.toString(),
      closePrice: t.closePrice?.toString() ?? null,
      createdAt: t.createdAt.toISOString(),
      settledAt: t.settledAt?.toISOString() ?? null,
    })),
  };
}

export async function getAdminTreasury() {
  await requireAdmin();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    balanceAgg,
    demoAgg,
    pendingWithdrawals,
    todayDeposits,
    todayWithdrawals,
    history,
    vault,
  ] = await Promise.all([
    prisma.user.aggregate({
      where: { deposits: { some: { status: "VERIFIED" } } },
      _sum: { balance: true },
    }),
    prisma.user.aggregate({
      where: { deposits: { none: { status: "VERIFIED" } } },
      _sum: { balance: true },
    }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "PENDING" },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.depositRequest.aggregate({
      where: { status: "VERIFIED", createdAt: { gte: todayStart } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.withdrawalRequest.aggregate({
      where: { status: { in: ["APPROVED", "PAID"] }, createdAt: { gte: todayStart } },
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
    getVaultSnapshot(),
  ]);

  const totalBalance = Number(balanceAgg._sum.balance ?? 0);
  const demoBalance = Number(demoAgg._sum.balance ?? 0);
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

  let running = 0;
  const historyWithClosing = historyArray.map((row) => {
    running += row.deposits - row.withdrawals;
    return { ...row, closing: running };
  });

  return {
    snapshot: {
      totalBalance,
      demoBalance,
      userLiabilities: totalBalance,
      pendingWithdrawals: pendingCount,
      pendingWithdrawalAmount: pendingAmount,
      todayDeposits: Number(todayDeposits._sum.amount ?? 0),
      todayWithdrawals: Number(todayWithdrawals._sum.amount ?? 0),
      activeExposure: vault.activeExposure,
      availableReserve: vault.availableReserve,
      reservePercent: Math.round(vault.reservePercent * 100) / 100,
      coverageWeeks: vault.coverageWeeks,
    },
    history: historyWithClosing,
  };
}

export async function getAdminFinance() {
  await requireAdmin();

  const [deposits, withdrawals] = await Promise.all([
    prisma.depositRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.withdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const txns = [
    ...deposits.map((d) => ({
      id: d.id,
      type: "deposit" as const,
      userId: d.userId,
      userName: d.user.name,
      userEmail: d.user.email,
      amount: d.amount,
      method: d.method,
      network: d.network,
      txHash: d.txHash,
      status: d.status.toLowerCase(),
      createdAt: d.createdAt.toISOString(),
      reviewedAt: d.reviewedAt?.toISOString() ?? null,
    })),
    ...withdrawals.map((w) => ({
      id: w.id,
      type: "withdrawal" as const,
      userId: w.userId,
      userName: w.user.name,
      userEmail: w.user.email,
      amount: w.amount,
      method: w.method,
      network: w.network,
      txHash: w.walletAddress,
      status: w.status.toLowerCase(),
      createdAt: w.createdAt.toISOString(),
      reviewedAt: w.reviewedAt?.toISOString() ?? null,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    pendingDeposits: deposits.filter((d) => d.status === "PENDING").length,
    pendingWithdrawals: withdrawals.filter((w) => w.status === "PENDING").length,
    totalDeposits: deposits.filter((d) => d.status === "VERIFIED").reduce((s, d) => s + d.amount, 0),
    totalWithdrawals: withdrawals.filter((w) => w.status === "APPROVED" || w.status === "PAID").reduce((s, w) => s + w.amount, 0),
  };

  return { txns, stats };
}

export async function getAdminAuditLogs() {
  await requireAdmin();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });

  return {
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
  };
}

export async function getAdminSettings() {
  await requireAdmin();
  const settings = await getSettings();
  return Object.keys(SETTING_DEFAULTS).map((key) => ({
    key,
    label: SETTING_DEFAULTS[key].label,
    value: settings[key] ?? SETTING_DEFAULTS[key].value,
  }));
}

export async function getAdminExposure() {
  await requireAdmin();

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

  return { exposure };
}

export async function getAdminPnl(days = 30) {
  await requireAdmin();
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

  return {
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
  };
}

export async function getAdminPairs() {
  await requireAdmin();

  const pairs = await prisma.pair.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { trades: true } } },
  });

  return {
    pairs: pairs.map((p) => ({
      ...p,
      basePrice: p.basePrice.toString(),
      volatility: p.volatility.toString(),
      payoutPercent: p.payoutPercent.toString(),
      weekendPayout: p.weekendPayout?.toString() ?? null,
      spread: p.spread.toString(),
      minTrade: p.minTrade.toString(),
      maxTrade: p.maxTrade.toString(),
      maxPayout: p.maxPayout?.toString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}

export async function getAdminPromos() {
  await requireAdmin();

  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { uses: true } } },
  });

  return {
    promos: promos.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      validUntil: p.validUntil?.toISOString() ?? null,
    })),
  };
}

export async function getAdminKyc(status?: string) {
  await requireAdmin();

  const where = status ? { status: status as "PENDING" } : {};
  const [submissions, counts] = await Promise.all([
    prisma.kycSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.kycSubmission.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const userIds = [...new Set(submissions.map((s) => s.userId))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    submissions: submissions.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      user: userMap.get(s.userId) ?? null,
    })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
  };
}

export async function getAdminPaymentMethods() {
  await requireAdmin();

  const methods = await prisma.paymentMethod.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return { methods };
}

export async function getAdminResources() {
  await requireAdmin();

  const categories = await prisma.resourceCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      assets: {
        orderBy: { createdAt: "desc" },
        select: { id: true, filename: true, mime: true, size: true, createdAt: true, key: true },
      },
      _count: { select: { assets: true } },
    },
  });

  const withUrls = categories.map((c) => ({
    ...c,
    assets: c.assets.map((a) => ({
      ...a,
      url: `/api/resources/${a.id}`,
      storage: a.key ? "minio" : "db",
    })),
  }));

  return { categories: withUrls };
}

export async function getUserTransactions(userId: string, limit = 100) {
  const user = await requireAuth();
  if (user.id !== userId) redirect("/");

  const entries = await prisma.ledgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return { history: entries };
}

export async function getUserNotifications(userId: string, limit = 50) {
  const user = await requireAuth();
  if (user.id !== userId) redirect("/");

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { notifications, unread };
}

export async function getMarketPairs(category?: string) {
  const pairs = await prisma.pair.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });

  let live: Record<string, number> = {};
  try {
    const { getOTCEngine } = await import("@/lib/otc-engine");
    const engine = await getOTCEngine();
    for (const p of pairs) {
      const v = engine.getCurrentPrice(p.id);
      if (v != null && Number.isFinite(v)) live[p.id] = v;
    }
  } catch {}

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const refs = await Promise.all(
    pairs.map((p) =>
      prisma.candle
        .findFirst({
          where: { pairId: p.id, timestamp: { lte: BigInt(cutoff) } },
          orderBy: { timestamp: "desc" },
          select: { close: true },
        })
        .catch(() => null),
    ),
  );

  const out = pairs.map((p, i) => {
    const cur = live[p.id] ?? Number(p.basePrice);
    const ref = refs[i] ? Number(refs[i]!.close) : null;
    const changePct24h = ref != null && ref > 0 ? ((cur - ref) / ref) * 100 : null;
    return {
      id: p.id,
      name: p.name,
      symbol: p.symbol,
      category: p.category,
      payoutPercent: Number(p.payoutPercent),
      weekendPayout: p.weekendPayout != null ? Number(p.weekendPayout) : null,
      minTrade: Number(p.minTrade),
      maxTrade: Number(p.maxTrade),
      iconUrl: (p as { iconUrl?: string | null }).iconUrl ?? null,
      iconUrl2: (p as { iconUrl2?: string | null }).iconUrl2 ?? null,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      sortOrder: p.sortOrder,
      description: p.description,
      tradingHours: p.tradingHours,
      tags: p.tags,
      changePct24h,
    };
  });

  return { pairs: out };
}
