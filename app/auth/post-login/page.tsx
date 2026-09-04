'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

const ADMIN_ROLES = new Set(['super_admin', 'finance', 'support', 'risk']);

export default function PostLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await authClient.getSession();
        const user = session?.data?.user as unknown as
          | { role?: string; emailVerified?: boolean; twoFactorEnabled?: boolean; email?: string }
          | undefined;
        if (!user) {
          router.replace('/login');
          return;
        }
        if (user.email) {
          const preCheck = await fetch('/api/auth/check-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
          }).then((r) => r.json()).catch(() => ({ allowed: true }));
          if (preCheck && preCheck.allowed === false) {
            await authClient.signOut();
            if (!cancelled) setError(preCheck.error || 'This account is not allowed to log in.');
            return;
          }
          await fetch('/api/auth/record-login-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, success: true }),
          }).catch(() => {});
        }
        if (user.role && ADMIN_ROLES.has(user.role)) {
          router.replace('/console-panel');
        } else if (!user.emailVerified) {
          router.replace(`/verify-email?email=${encodeURIComponent(user.email ?? '')}`);
        } else if (!user.twoFactorEnabled) {
          router.replace('/setup-2fa');
        } else {
          router.replace('/trade/demo');
        }
        router.refresh();
      } catch {
        if (!cancelled) setError('Something went wrong. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {error ? (
          <div className="p-4 bg-red/10 border border-red/20 rounded-xl text-red text-sm font-semibold">
            {error}
          </div>
        ) : (
          <p className="text-sm text-text-dark">Finishing sign-in...</p>
        )}
      </div>
    </div>
  );
}
