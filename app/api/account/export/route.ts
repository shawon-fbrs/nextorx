import { getSessionUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = sessionUser.id;
    const [user, trades, deposits, withdrawals, ledger, kyc, sessions, exclusion] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true, uid: true, name: true, email: true, emailVerified: true,
            role: true, phone: true, nickname: true, firstName: true, lastName: true,
            country: true, currencyPref: true, balance: true, bonusBalance: true,
            kycStatus: true, twoFactorEnabled: true, depositLimitDaily: true, createdAt: true,
          },
        }),
        prisma.trade.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5000 }),
        prisma.depositRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000 }),
        prisma.withdrawalRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000 }),
        prisma.ledgerEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5000 }),
        prisma.kycSubmission.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { id: true, tier: true, idType: true, status: true, reviewedAt: true, note: true, createdAt: true },
        }),
        prisma.session.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
        }),
        prisma.selfExclusion.findUnique({ where: { userId } }),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      trades: trades.map((t) => ({ ...t, openPrice: t.openPrice.toString(), closePrice: t.closePrice?.toString() ?? null, payoutPercent: t.payoutPercent.toString() })),
      deposits,
      withdrawals,
      ledger,
      kycSubmissions: kyc,
      sessions,
      selfExclusion: exclusion,
      notice: "Financial records are retained for 7 years to meet legal obligations, even after account deletion.",
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nextorx-data-export-${userId}.json"`,
      },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
