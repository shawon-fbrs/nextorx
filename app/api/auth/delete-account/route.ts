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

    // TRACK-B B4: replace ledger wipe with anonymization (7-yr financial retention).
    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: sessionUser.id } });
      await tx.ledgerEntry.deleteMany({ where: { userId: sessionUser.id } });
      await tx.trade.deleteMany({ where: { userId: sessionUser.id } });
      await tx.depositRequest.deleteMany({ where: { userId: sessionUser.id } });
      await tx.withdrawalRequest.deleteMany({ where: { userId: sessionUser.id } });
      await tx.walletHold.deleteMany({ where: { userId: sessionUser.id } });
      await tx.notification.deleteMany({ where: { userId: sessionUser.id } });
      await tx.auditLog.deleteMany({ where: { actorId: sessionUser.id } });
      await tx.promoCodeUse.deleteMany({ where: { userId: sessionUser.id } });
      await tx.verification.deleteMany({ where: { identifier: { contains: sessionUser.id } } });
      await tx.twoFactor.deleteMany({ where: { userId: sessionUser.id } });
      await tx.bannedUser.deleteMany({ where: { userId: sessionUser.id } });
      await tx.failedLoginAttempt.deleteMany({ where: { userId: sessionUser.id } });
      await tx.userRiskProfile.deleteMany({ where: { userId: sessionUser.id } });
      await tx.account.deleteMany({ where: { userId: sessionUser.id } });
      await tx.user.delete({ where: { id: sessionUser.id } });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return toJsonError(e);
  }
}
