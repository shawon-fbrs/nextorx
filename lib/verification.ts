import { prisma } from '@/lib/db';
import crypto from 'crypto';

// Generate a 6-digit verification code (cryptographically secure)
export function generateVerificationCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b % 10).join('');
}

// Generate a secure reset token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash the reset token for storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Store verification code
export async function storeVerificationCode(
  email: string,
  code: string,
  type: 'email_verification' | 'password_reset'
): Promise<void> {
  // Delete any existing codes for this email and type
  await prisma.verification.deleteMany({
    where: {
      identifier: `${type}:${email}`,
    },
  });

  // Create new verification code (expires in 15 minutes)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  await prisma.verification.create({
    data: {
      identifier: `${type}:${email}`,
      value: code,
      expiresAt,
    },
  });
}

// Verify the code
export async function verifyCode(
  email: string,
  code: string,
  type: 'email_verification' | 'password_reset'
): Promise<{ valid: boolean; error?: string }> {
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: `${type}:${email}`,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    return { valid: false, error: 'No verification code found' };
  }

  if (verification.expiresAt < new Date()) {
    return { valid: false, error: 'Verification code has expired' };
  }

  if (verification.value !== code) {
    return { valid: false, error: 'Invalid verification code' };
  }

  // Delete the used code
  await prisma.verification.delete({
    where: { id: verification.id },
  });

  return { valid: true };
}

// Store reset token
export async function storeResetToken(
  email: string,
  tokenHash: string
): Promise<void> {
  // Delete any existing reset tokens for this email
  await prisma.verification.deleteMany({
    where: {
      identifier: `password_reset:${email}`,
    },
  });

  // Create new reset token (expires in 1 hour)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await prisma.verification.create({
    data: {
      identifier: `password_reset:${email}`,
      value: tokenHash,
      expiresAt,
    },
  });
}

// Verify reset token
export async function verifyResetToken(
  email: string,
  tokenHash: string
): Promise<{ valid: boolean; error?: string }> {
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: `password_reset:${email}`,
      value: tokenHash,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    return { valid: false, error: 'Invalid reset token' };
  }

  if (verification.expiresAt < new Date()) {
    return { valid: false, error: 'Reset token has expired' };
  }

  // Delete the used token
  await prisma.verification.delete({
    where: { id: verification.id },
  });

  return { valid: true };
}

// Check rate limit for verification requests
export async function checkVerificationRateLimit(
  email: string,
  type: 'email_verification' | 'password_reset',
  maxAttempts: number = 3,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  const attempts = await prisma.verification.count({
    where: {
      identifier: `${type}:${email}`,
      createdAt: { gte: windowStart },
    },
  });

  if (attempts >= maxAttempts) {
    const oldestAttempt = await prisma.verification.findFirst({
      where: {
        identifier: `${type}:${email}`,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (oldestAttempt) {
      const retryAfter = Math.ceil(
        (oldestAttempt.createdAt.getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000
      );
      return { allowed: false, retryAfter: Math.max(0, retryAfter) };
    }

    return { allowed: false, retryAfter: windowMinutes * 60 };
  }

  return { allowed: true };
}
