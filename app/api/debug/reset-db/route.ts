import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const RESET_SECRET = "nextorx-reset-2026";

function generateReferralCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function generateUid(): string {
  return String(10000000 + Math.floor(Math.random() * 90000000));
}

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

    const adminEmail = process.env.ADMIN_EMAIL || "admin@nextorx.app";
    const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe!123456";

    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: "Admin",
      },
      headers: req.headers,
    });

    if (!signUpResult?.user) {
      throw new Error("Failed to create admin user");
    }

    const userId = signUpResult.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "super_admin",
        emailVerified: true,
        referralCode: generateReferralCode(),
        uid: generateUid(),
      },
    });

    const userCount = await prisma.user.count();
    const pairCount = await prisma.pair.count();

    return NextResponse.json({
      success: true,
      users: userCount,
      pairs: pairCount,
      admin: adminEmail,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 },
    );
  }
}
