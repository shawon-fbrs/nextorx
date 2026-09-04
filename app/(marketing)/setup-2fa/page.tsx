'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import QRCode from 'qrcode';

export default function Setup2FAPage() {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'qr' | 'verify' | 'backup'>('password');
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupSaved, setBackupSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/has-password')
      .then((r) => r.json())
      .then((d) => setHasPassword(d.hasPassword ?? true))
      .catch(() => setHasPassword(true));
  }, []);

  const startEnable = async (pw?: string) => {
    const { data, error: authError } = await authClient.twoFactor.enable(
      pw ? { password: pw } : {},
    );

    if (authError) {
      setError(authError.message || 'Could not start 2FA setup');
      return;
    }

    if (data && (data as Record<string, unknown>).totpURI) {
      const uri = (data as Record<string, unknown>).totpURI as string;
      setTotpUri(uri);
      const qrUrl = await QRCode.toDataURL(uri, {
        width: 256,
        margin: 2,
        color: { dark: '#ffffff', light: '#00000000' },
      });
      setQrDataUrl(qrUrl);
      setStep('qr');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await startEnable(password || undefined);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        const codes = (data as Record<string, unknown>).backupCodes as string[] | undefined;
        if (codes && codes.length > 0) {
          setBackupCodes(codes);
          setStep('backup');
        } else {
          router.push('/trade/demo');
          router.refresh();
        }
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
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
              <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
              <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
              <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
              <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
            </svg>
            <span className="text-white font-bold text-xl tracking-wide">NEXTORX</span>
          </Link>
          <div className="w-16 h-16 bg-blue/10 border border-blue/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Set Up Two-Factor Authentication</h1>
          <p className="text-sm text-text-dark">
            {step === 'password' && (hasPassword === false ? 'Confirm it is you to continue' : 'Enter your password to confirm your identity')}
            {step === 'qr' && 'Scan this QR code with your authenticator app'}
            {step === 'verify' && 'Enter the 6-digit code from your authenticator app'}
            {step === 'backup' && 'Save your recovery codes'}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-xl text-red text-xs font-semibold">
              {error}
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {hasPassword === false ? (
                <div className="bg-blue/5 border border-blue/20 rounded-xl p-3.5">
                  <p className="text-[11px] text-text leading-relaxed">
                    You signed in with Google, so there is no password to confirm. Continue to get your authenticator QR code.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading || (hasPassword !== false && !password)}
                className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'qr' && (
            <div className="space-y-4">
              <div className="bg-background rounded-xl p-6 flex flex-col items-center">
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                )}
              </div>
              <div className="bg-background/50 rounded-xl px-4 py-3">
                <p className="text-[11px] text-text-dark font-semibold uppercase tracking-wider mb-2">Manual entry key</p>
                <p className="text-xs text-white font-mono break-all">
                  {totpUri.replace('otpauth://totp/', '').replace(/[?&].*$/, '')}
                </p>
              </div>
              <button
                onClick={() => setStep('verify')}
                className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98]"
              >
                I&apos;ve scanned the QR code
              </button>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">
                  Verification Code
                </label>
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
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </form>
          )}
          {step === 'backup' && (
            <div className="space-y-4">
              <div className="bg-background/50 rounded-xl px-4 py-3">
                <p className="text-[11px] text-text-dark font-semibold uppercase tracking-wider mb-2">Recovery codes — store somewhere safe</p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((c) => (
                    <p key={c} className="text-xs text-white font-mono bg-background rounded-lg px-3 py-2 text-center">{c}</p>
                  ))}
                </div>
                <p className="text-[11px] text-text-dark mt-3 leading-relaxed">
                  Each code works once. If you lose your authenticator, support will ask for one of these.
                </p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupSaved}
                  onChange={(e) => setBackupSaved(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-border bg-background accent-green"
                />
                <span className="text-[11px] text-text-dark leading-relaxed">I have saved these codes</span>
              </label>
              <button
                onClick={() => { router.push('/trade/demo'); router.refresh(); }}
                disabled={!backupSaved}
                className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Done
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
