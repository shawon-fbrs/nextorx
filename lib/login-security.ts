import { prisma } from '@/lib/db';
import { sendLoginNotificationEmail } from '@/lib/email';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export interface LoginAttemptResult {
  allowed: boolean;
  error?: string;
  lockoutMinutes?: number;
}

// Check if login is allowed
export async function checkLoginAllowed(
  email: string,
  ip?: string
): Promise<LoginAttemptResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: {
        where: { providerId: 'credential' },
      },
    },
  });

  if (!user) {
    return { allowed: true };
  }

  // Check if user is banned
  const bannedUser = await prisma.bannedUser.findUnique({
    where: { userId: user.id },
  });

  if (bannedUser) {
    return { allowed: false, error: 'Account has been banned' };
  }

  // Check if user is locked out
  const failedAttempts = await prisma.failedLoginAttempt.findMany({
    where: {
      userId: user.id,
      attemptedAt: {
        gte: new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000),
      },
    },
    orderBy: { attemptedAt: 'desc' },
  });

  if (failedAttempts.length >= MAX_FAILED_ATTEMPTS) {
    const lastAttempt = failedAttempts[0];
    const lockoutEnd = new Date(
      lastAttempt.attemptedAt.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000
    );
    const remainingMinutes = Math.ceil(
      (lockoutEnd.getTime() - Date.now()) / (60 * 1000)
    );

    if (remainingMinutes > 0) {
      return {
        allowed: false,
        error: `Account temporarily locked. Try again in ${remainingMinutes} minutes`,
        lockoutMinutes: remainingMinutes,
      };
    }
  }

  return { allowed: true };
}

// Record failed login attempt
export async function recordFailedLogin(
  email: string,
  ip?: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return;
  }

  await prisma.failedLoginAttempt.create({
    data: {
      userId: user.id,
      ip: ip || 'unknown',
      attemptedAt: new Date(),
    },
  });

  // Check if this triggers a lockout
  const recentAttempts = await prisma.failedLoginAttempt.count({
    where: {
      userId: user.id,
      attemptedAt: {
        gte: new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000),
      },
    },
  });

  if (recentAttempts >= MAX_FAILED_ATTEMPTS) {
    // Send alert email
    if (user.email) {
      await sendLoginNotificationEmail(
        user.email,
        'Multiple failed login attempts',
        'Security alert',
        user.name || undefined
      );
    }
  }
}

// Clear failed login attempts on successful login
export async function clearFailedLogins(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return;
  }

  await prisma.failedLoginAttempt.deleteMany({
    where: { userId: user.id },
  });
}

// Send login notification
export async function notifyLogin(
  email: string,
  device: string,
  location: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.email) {
    return;
  }

  await sendLoginNotificationEmail(user.email, device, location, user.name || undefined);
}
