import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const RESET_SECRET = "nextorx-reset-2026";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.secret !== RESET_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.promoCodeUse.deleteMany(),
      prisma.userRiskProfile.deleteMany(),
      prisma.walletHold.deleteMany(),
      prisma.withdrawalRequest.deleteMany(),
      prisma.depositRequest.deleteMany(),
      prisma.ledgerEntry.deleteMany(),
      prisma.trade.deleteMany(),
      prisma.session.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    const userCount = await prisma.user.count();
    const pairCount = await prisma.pair.count();

    return NextResponse.json({
      success: true,
      users: userCount,
      pairs: pairCount,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
