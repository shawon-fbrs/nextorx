import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import {
  generateResetToken,
  hashToken,
  storeResetToken,
  checkVerificationRateLimit,
} from '@/lib/verification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check rate limit (3 requests per hour)
    const rateLimit = await checkVerificationRateLimit(email, 'password_reset', 3, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${rateLimit.retryAfter} seconds` },
        { status: 429 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({ success: true });
    }

    // Generate and store reset token
    const resetToken = generateResetToken();
    const tokenHash = hashToken(resetToken);
    await storeResetToken(email, tokenHash);

    // Send reset email
    const result = await sendPasswordResetEmail(email, resetToken, user.name);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PasswordReset] Send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
