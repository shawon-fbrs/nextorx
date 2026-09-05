import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError, parseListQuery } from "@/lib/api";
import { getLedgerHistory } from "@/lib/ledger";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { limit } = parseListQuery(request.nextUrl);

    const [profile, history, lockedAgg, demoLockedAgg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          balance: true,
          demoBalance: true,
          bonusBalance: true,
          referralCode: true,
          kycStatus: true,
          currencyPref: true,
        },
      }),
      getLedgerHistory(user.id, limit),
      prisma.trade.aggregate({
        where: { userId: user.id, status: "ACTIVE", wallet: "real" },
        _sum: { amount: true },
      }),
      prisma.trade.aggregate({
        where: { userId: user.id, status: "ACTIVE", wallet: "demo" },
        _sum: { amount: true },
      }),
    ]);

    const locked = lockedAgg._sum.amount ?? 0;
    const demoLocked = demoLockedAgg._sum.amount ?? 0;
    const available = profile?.balance ?? 0;
    const demoAvailable = profile?.demoBalance ?? 0;

    return Response.json({
      wallet: profile,
      history,
      available,
      locked,
      total: available + locked,
      demoAvailable,
      demoLocked,
      demoTotal: demoAvailable + demoLocked,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
