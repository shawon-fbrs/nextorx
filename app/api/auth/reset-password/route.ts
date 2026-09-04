import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashToken, verifyResetToken } from '@/lib/verification';
import { hashPassword } from 'better-auth/crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, password } = body;

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: 'Email, token, and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one lowercase letter' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      );
    }

    if (!/[!@#$%^&*]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one special character (!@#$%^&*)' },
        { status: 400 }
      );
    }

    // Verify the token
    const tokenHash = hashToken(token);
    const result = await verifyResetToken(email, tokenHash);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password using better-auth's hashPassword (scrypt, matches login verification)
    const hashedPassword = await hashPassword(password);

    // Update existing credential account, or create one for social-only users
    // so password recovery actually restores access.
    const updated = await prisma.account.updateMany({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
      data: {
        password: hashedPassword,
        issuer: 'local:credential',
      },
    });

    if (updated.count === 0) {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          issuer: 'local:credential',
          password: hashedPassword,
        },
      });
    }

    // Invalidate all existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PasswordReset] Reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
