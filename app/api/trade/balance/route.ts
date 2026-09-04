import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError, parseListQuery } from "@/lib/api";
import { getLedgerHistory } from "@/lib/ledger";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { limit } = parseListQuery(request.nextUrl);

    const [profile, history] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          balance: true,
          bonusBalance: true,
          referralCode: true,
          kycStatus: true,
          currencyPref: true,
        },
      }),
      getLedgerHistory(user.id, limit),
    ]);

    return Response.json({ wallet: profile, history });
  } catch (e) {
    return toJsonError(e);
  }
}
