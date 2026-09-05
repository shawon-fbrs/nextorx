'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { checkPasswordStrength, PASSWORD_REQUIREMENTS } from '@/lib/password';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [accountExists, setAccountExists] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = checkPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAccountExists(false);

    if (!agreed) {
      setError('You must agree to the Terms of Service');
      return;
    }

    if (!passwordStrength.isValid) {
      setError('Password does not meet requirements');
      return;
    }

    setLoading(true);

    try {
      const hint = await fetch('/api/auth/login-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then((r) => r.json()).catch(() => ({ methods: [] }));
      if (((hint?.methods ?? []) as string[]).length > 0) {
        setAccountExists(true);
        setError('An account with this email already exists.');
        return;
      }

      const ref = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() || undefined
        : undefined;
      if (ref) {
        try {
          localStorage.setItem('nextorx-ref', ref);
        } catch {}
      }
      const { data, error: authError } = await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim() || email.split('@')[0],
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        ...(ref ? { referredBy: ref } : {}),
      } as Parameters<typeof authClient.signUp.email>[0]);

      if (authError) {
        const msg = authError.message || '';
        if (msg.toLowerCase().includes('already')) {
          setAccountExists(true);
          setError('An account with this email already exists.');
        } else {
          setError(msg || 'Registration failed');
        }
        return;
      }

      if (data) {
        try {
          await fetch('/api/auth/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
        } catch {}

        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/auth/post-login',
      });
    } catch {
      setError('Google registration failed');
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
          <h1 className="text-2xl font-black text-white mb-2">Create Account</h1>
          <p className="text-sm text-text-dark">Start trading with a free demo account</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-xl text-red text-xs font-semibold">
              {error}
              {accountExists && (
                <Link href="/login" className="block mt-2 text-green hover:text-green-hover">
                  Log in instead →
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
                />
              </div>
            </div>
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
                placeholder="Min. 12 characters"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
              />
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < passwordStrength.score ? passwordStrength.color : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    {PASSWORD_REQUIREMENTS.map((req) => (
                      <div key={req.label} className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${req.test(password) ? 'bg-green' : 'bg-border'}`} />
                        <span className={`text-[10px] ${req.test(password) ? 'text-green' : 'text-text-dark'}`}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-border bg-background accent-green"
                />
                <span className="text-[11px] text-text-dark leading-relaxed">
                  I agree to the <Link href="/terms" className="text-blue hover:text-blue-hover">Terms of Service</Link> and <Link href="/privacy" className="text-blue hover:text-blue-hover">Privacy Policy</Link>. I confirm I am at least 18 years old.
                </span>
              </label>
            </div>
            <button
              type="submit"
              disabled={loading || !passwordStrength.isValid}
              className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-surface px-3 text-[11px] text-text-dark font-semibold">or sign up with</span></div>
          </div>

          <button
            onClick={handleGoogleRegister}
            className="w-full bg-background border border-border hover:bg-surface-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Google
          </button>
        </div>

        <p className="text-center text-xs text-text-dark mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-green hover:text-green-hover font-semibold transition-colors">Log in</Link>
        </p>
      </div>
    </div>
  );
}
