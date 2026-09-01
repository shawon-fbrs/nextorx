import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyCode } from '@/lib/verification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Verify the code
    const result = await verifyCode(email, code, 'email_verification');

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Mark email as verified
    await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Verification] Verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
