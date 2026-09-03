import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, toJsonError } from '@/lib/api';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 12) {
      return NextResponse.json(
        { error: 'New password must be at least 12 characters' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must include uppercase, lowercase, number, and special character' },
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
      password: currentPassword,
      hash: account.password,
    });

    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    await prisma.session.deleteMany({
      where: { userId: sessionUser.id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return toJsonError(e);
  }
}
