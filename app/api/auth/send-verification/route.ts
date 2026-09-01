import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import {
  generateVerificationCode,
  storeVerificationCode,
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

    // Check rate limit
    const rateLimit = await checkVerificationRateLimit(email, 'email_verification', 3, 60);
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

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({ success: true });
    }

    // Generate and store verification code
    const code = generateVerificationCode();
    await storeVerificationCode(email, code, 'email_verification');

    // Send verification email
    const result = await sendVerificationEmail(email, code, user.name);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Verification] Send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
