import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, toJsonError } from '@/lib/api';
import { verifyPassword } from 'better-auth/crypto';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: sessionUser.id,
        providerId: 'credential',
      },
    });

    if (!account || !account.password) {
      return NextResponse.json(
        { error: 'No password set for this account' },
        { status: 400 }
      );
    }

    const valid = await verifyPassword({
      password,
      hash: account.password,
    });

    if (!valid) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 400 }
      );
    }

    const activeTrades = await prisma.trade.count({
      where: {
        userId: sessionUser.id,
        status: 'ACTIVE',
      },
    });

    if (activeTrades > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with active trades. Close all trades first.' },
        { status: 400 }
      );
    }

    const pendingWithdrawals = await prisma.withdrawalRequest.count({
      where: {
        userId: sessionUser.id,
        status: 'PENDING',
      },
    });

    if (pendingWithdrawals > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with pending withdrawals.' },
        { status: 400 }
      );
    }

    await prisma.session.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.ledgerEntry.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.trade.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.depositRequest.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.withdrawalRequest.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.walletHold.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.notification.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: sessionUser.id } });
    await prisma.promoCodeUse.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.verification.deleteMany({ where: { identifier: { contains: sessionUser.id } } });

    const twoFactor = await prisma.twoFactor.findUnique({ where: { userId: sessionUser.id } });
    if (twoFactor) await prisma.twoFactor.delete({ where: { userId: sessionUser.id } });

    const bannedUser = await prisma.bannedUser.findUnique({ where: { userId: sessionUser.id } });
    if (bannedUser) await prisma.bannedUser.delete({ where: { userId: sessionUser.id } });

    await prisma.failedLoginAttempt.deleteMany({ where: { userId: sessionUser.id } });

    const riskProfile = await prisma.userRiskProfile.findUnique({ where: { userId: sessionUser.id } });
    if (riskProfile) await prisma.userRiskProfile.delete({ where: { userId: sessionUser.id } });

    await prisma.account.deleteMany({ where: { userId: sessionUser.id } });

    await prisma.user.delete({ where: { id: sessionUser.id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return toJsonError(e);
  }
}
