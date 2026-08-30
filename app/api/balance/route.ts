import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { getLedgerHistory } from "@/lib/ledger";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);

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
      getLedgerHistory(user.id, Math.min(limit, 200)),
    ]);

    return Response.json({ wallet: profile, history });
  } catch (e) {
    return toJsonError(e);
  }
}
