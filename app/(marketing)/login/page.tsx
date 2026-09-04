'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const preCheck = await fetch('/api/auth/check-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then((r) => r.json()).catch(() => ({ allowed: true }));
      if (preCheck && preCheck.allowed === false) {
        setError(preCheck.error || 'Login is temporarily blocked. Please try again later.');
        return;
      }

      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        await fetch('/api/auth/record-login-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, success: false }),
        }).catch(() => {});
        const msg = authError.message || '';
        if (msg.includes('locked') || msg.includes('too many')) {
          setError('Account temporarily locked due to too many failed attempts. Please try again later.');
        } else if (msg.includes('banned')) {
          setError('This account has been banned. Contact support.');
        } else if (msg.includes('Invalid') || msg.includes('credentials')) {
          const hint = await fetch('/api/auth/login-hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          }).then((r) => r.json()).catch(() => ({ methods: [] }));
          const methods = (hint?.methods ?? []) as string[];
          if (methods.length > 0 && !methods.includes('password')) {
            setError('This email uses Google sign-in. Continue with Google below, or use Forgot password to set a password.');
          } else {
            setError('Invalid email or password.');
          }
        } else {
          setError(msg || 'Login failed. Please try again.');
        }
        return;
      }

      if (data) {
        await fetch('/api/auth/record-login-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, success: true }),
        }).catch(() => {});
        const d = data as Record<string, unknown>;
        if (d.twoFactorRedirect) {
          router.push('/2fa-verify');
          return;
        }
        const session = await authClient.getSession();
        const user = session?.data?.user as Record<string, unknown>;
        const role = user?.role as string;
        const twoFactorEnabled = user?.twoFactorEnabled as boolean;
        const emailVerified = user?.emailVerified as boolean;

        if (role === 'super_admin' || role === 'finance' || role === 'support' || role === 'risk') {
          if (!twoFactorEnabled) {
            router.push('/setup-2fa');
          } else {
            router.push('/console-panel');
          }
        } else if (!emailVerified) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } else if (!twoFactorEnabled) {
          router.push('/setup-2fa');
        } else {
          router.push('/trade/demo');
        }
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/auth/post-login',
      });
    } catch {
      setError('Google login failed');
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
              <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
              <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
              <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
              <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
            </svg>
            <span className="text-white font-bold text-xl tracking-wide">NEXTORX</span>
          </Link>
          <h1 className="text-2xl font-black text-white mb-2">Welcome Back</h1>
          <p className="text-sm text-text-dark">Log in to your trading account</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-xl text-red text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border bg-background accent-green" />
                <span className="text-xs text-text-dark">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-xs text-blue hover:text-blue-hover transition-colors font-semibold">Forgot password?</Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-surface px-3 text-[11px] text-text-dark font-semibold">or continue with</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-background border border-border hover:bg-surface-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Google
          </button>
        </div>

        <p className="text-center text-xs text-text-dark mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-green hover:text-green-hover font-semibold transition-colors">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
