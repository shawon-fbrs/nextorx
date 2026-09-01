'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkPasswordStrength, PASSWORD_REQUIREMENTS } from '@/lib/password';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = checkPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordStrength.isValid) {
      setError('Password does not meet requirements');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <p className="text-text-dark">Invalid reset link.</p>
          <Link href="/forgot-password" className="text-green hover:text-green-hover mt-4 inline-block">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-black text-white mb-2">Create new password</h1>
          <p className="text-sm text-text-dark">
            Enter your new password below
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold">Password reset!</p>
              <p className="text-text-dark text-sm mt-2">Redirecting to login...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-xl text-red text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">
                    New Password
                  </label>
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
                  <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red mt-1">Passwords do not match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !passwordStrength.isValid || password !== confirmPassword}
                  className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-text flex items-center justify-center">
        <p className="text-text-dark">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
