'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await authClient.twoFactor.verifyTotp({
        code,
      });

      if (authError) {
        setError(authError.message || 'Invalid code. Please try again.');
        return;
      }

      if (data) {
        const session = await authClient.getSession();
        const user = session?.data?.user as Record<string, unknown>;
        const role = user?.role as string;
        if (role === 'super_admin' || role === 'admin' || role === 'moderator') {
          router.push('/console-panel');
        } else {
          router.push('/trade/demo');
        }
        router.refresh();
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue/10 border border-blue/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Two-Factor Authentication</h1>
          <p className="text-sm text-text-dark">Enter the 6-digit code from your authenticator app</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-xl text-red text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white text-center tracking-[0.5em] font-mono placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
