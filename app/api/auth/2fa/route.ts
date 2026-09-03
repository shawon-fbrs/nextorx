import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, toJsonError } from '@/lib/api';
import { verifyPassword } from 'better-auth/crypto';
import { authenticator } from 'otplib';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const { action, password, code } = body;

    if (action === 'status') {
      const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { twoFactorEnabled: true },
      });
      return NextResponse.json({ enabled: user?.twoFactorEnabled ?? false });
    }

    if (action === 'disable') {
      if (!password || !code) {
        return NextResponse.json(
          { error: 'Password and TOTP code are required' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { twoFactorEnabled: true },
      });

      if (!user?.twoFactorEnabled) {
        return NextResponse.json(
          { error: '2FA is not enabled' },
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
          { error: 'No password set' },
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

      const twoFactor = await prisma.twoFactor.findUnique({
        where: { userId: sessionUser.id },
      });

      if (!twoFactor) {
        return NextResponse.json(
          { error: '2FA record not found' },
          { status: 400 }
        );
      }

      const codeValid = authenticator.verify({
        token: code,
        secret: twoFactor.secret,
      });

      if (!codeValid) {
        return NextResponse.json(
          { error: 'Invalid TOTP code' },
          { status: 400 }
        );
      }

      await prisma.twoFactor.delete({
        where: { userId: sessionUser.id },
      });

      await prisma.user.update({
        where: { id: sessionUser.id },
        data: { twoFactorEnabled: false },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (e) {
    return toJsonError(e);
  }
}
