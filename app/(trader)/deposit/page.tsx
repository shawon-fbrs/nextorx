'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PaymentMethod = {
  id: string;
  name: string;
  label: string;
  networkName: string;
  logoUrl: string | null;
  networkLogoUrl: string | null;
  accountAddress: string | null;
  accountQrUrl: string | null;
  minDeposit: number;
  maxDeposit: number;
};

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];
const WAIT_SECONDS = 30 * 60;

function MethodLogo({ m, size = 44 }: { m: PaymentMethod; size?: number }) {
  return (
    <span className="relative inline-block flex-shrink-0" style={{ height: size, width: size + 12 }}>
      {m.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.logoUrl} alt={m.label} style={{ height: size, width: size }} className="absolute left-0 top-0 rounded-full object-contain bg-white border-2 border-background" />
      ) : (
        <span className="absolute left-0 top-0 rounded-full bg-surface flex items-center justify-center text-sm font-black text-white" style={{ height: size, width: size }}>
          {m.label.slice(0, 1)}
        </span>
      )}
      {m.networkLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.networkLogoUrl} alt={m.networkName} style={{ height: size / 2 + 6, width: size / 2 + 6 }} className="absolute rounded-full object-contain bg-white border-2 border-background" />
      )}
    </span>
  );
}

export default function DepositPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [depositId, setDepositId] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [note, setNote] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/trade/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setMethods((data.methods ?? []).filter((m: PaymentMethod) => m.accountAddress));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => methods.find((m) => m.id === methodId) ?? null, [methods, methodId]);
  const minUsd = selected ? selected.minDeposit / 100 : 10;
  const maxUsd = selected ? selected.maxDeposit / 100 : 1000000;
  const amountUsd = Number(amount);
  const validAmount = Number.isFinite(amountUsd) && amountUsd >= minUsd && amountUsd <= maxUsd;

  useEffect(() => {
    if (step !== 4 || !depositId) return;
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/trade/deposit?id=${depositId}`);
        const data = await res.json();
        const st = data.deposit?.status ?? '';
        if (st === 'VERIFIED') {
          await refresh();
          router.push('/trade/real');
          router.refresh();
        } else if (st === 'REJECTED') {
          setStatus('REJECTED');
          setNote(data.deposit?.note ?? null);
        } else {
          setStatus('PENDING');
        }
      } catch {
      }
    }, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [step, depositId, router, refresh]);

  if (!user) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Please log in</div>
      </div>
    );
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const downloadQr = (url: string, filename: string) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = filename;
        a.click();
      } catch {
        window.open(url, '_blank');
      }
    };
    img.onerror = () => window.open(url, '_blank');
    img.src = url;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/trade/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(Number(amount) * 100),
          method: selected.name,
          network: selected.networkName,
          txHash: txHash.trim(),
          walletAddress: selected.accountAddress,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Deposit request failed');
        return;
      }
      setDepositId(data.deposit?.id ?? '');
      setStatus('PENDING');
      setSecondsLeft(WAIT_SECONDS);
      setStep(4);
    } catch {
      setError('Deposit request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto">
        <Link href="/trade/demo" className="text-xs text-blue font-semibold">← Back</Link>
        <div className="flex items-center gap-2 mt-3 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${step >= s ? 'bg-green text-white' : 'bg-surface border border-border text-textDark'}`}>
                {s}
              </span>
              {s < 4 && <div className={`h-0.5 flex-1 rounded ${step > s ? 'bg-green' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="mb-4">
              <p className="text-xs text-text-dark mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-white">${((user.balance || 0) / 100).toFixed(2)}</p>
            </div>
            <h2 className="text-base font-bold text-white mb-3">Choose a payment method</h2>
            {loading ? (
              <div className="text-text-dark text-xs text-center py-10">Loading payment methods…</div>
            ) : methods.length === 0 ? (
              <div className="text-text-dark text-xs text-center py-10">No payment methods available right now.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMethodId(m.id);
                      setAmount('');
                      setStep(2);
                    }}
                    className="flex items-center gap-3 rounded-2xl border-2 border-border hover:border-green/50 bg-surface p-4 text-left transition-all"
                  >
                    <MethodLogo m={m} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">
                        {m.label}
                        {m.networkName ? <span className="text-textDark font-normal"> ({m.networkName})</span> : null}
                      </div>
                      <div className="text-[11px] text-textDark">Min deposit ${(m.minDeposit / 100).toFixed(0)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && selected && (
          <div>
            <button onClick={() => setStep(1)} className="text-xs text-textDark hover:text-white font-semibold mb-4">← Change payment method</button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(3);
              }}
              className="space-y-5 bg-surface border border-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-3">
                <MethodLogo m={selected} size={40} />
                <div className="text-sm font-bold text-white">
                  {selected.label}
                  {selected.networkName ? ` (${selected.networkName})` : ''}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Amount (USD)</label>
                <input
                  type="number" min={minUsd} max={maxUsd} step="any" required autoFocus
                  placeholder={`Min ${minUsd}`}
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-2xl font-bold text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue tabular-nums"
                />
                <p className="text-[11px] text-textDark mt-1">Min ${minUsd.toFixed(2)}{maxUsd < 1000000 ? ` · Max $${maxUsd.toFixed(2)}` : ''}</p>
                {amount.trim() !== '' && !validAmount && (
                  <p className="text-[11px] text-red mt-1">Minimum deposit is ${minUsd.toFixed(2)}.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.filter((n) => n >= minUsd && n <= maxUsd).map((n) => (
                  <button
                    key={n} type="button" onClick={() => setAmount(String(n))}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${amount === String(n) ? 'border-green/60 bg-green/15 text-green' : 'text-textDark hover:text-white hover:bg-surface-hover'}`}
                  >
                    ${n}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Promo code (optional)</label>
                <input
                  value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME50" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-text-dark/50 focus:outline-none focus:border-blue"
                />
                {promoCode.trim() !== '' && (
                  <p className="text-[11px] text-textDark mt-1">Bonus is added when the deposit is verified, with wagering requirements.</p>
                )}
              </div>
              <button type="submit" disabled={!validAmount || amount.trim() === ''} className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
                Continue to pay
              </button>
            </form>
          </div>
        )}

        {step === 3 && selected && (
          <div>
            <button onClick={() => setStep(2)} className="text-xs text-textDark hover:text-white font-semibold mb-4">← Back to amount</button>
            <div className="space-y-5 bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <MethodLogo m={selected} />
                <div>
                  <div className="text-sm font-bold text-white">
                    {selected.label}
                    {selected.networkName ? ` (${selected.networkName})` : ''}
                  </div>
                  <div className="text-sm text-textDark">Send <span className="font-bold text-white">${Number(amount).toFixed(2)}</span></div>
                </div>
              </div>

              {selected.accountQrUrl ? (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="rounded-2xl bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.accountQrUrl} alt={`${selected.label} QR`} width={220} height={220} className="h-[220px] w-[220px] object-contain" />
                    </div>
                  </div>
                  <button
                    onClick={() => downloadQr(selected.accountQrUrl!, `${selected.name}${selected.networkName ? `-${selected.networkName}` : ''}-qr.png`)}
                    className="w-full border border-border text-xs font-bold py-2 rounded-xl text-text hover:text-white hover:bg-surface-hover"
                  >
                    Download QR
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-2xl py-8 text-center text-xs text-textDark">
                  No QR code — use the address below
                </div>
              )}

              {selected.accountAddress && (
                <div className="space-y-2">
                  <p className="text-[11px] text-textDark font-semibold uppercase tracking-wider">Send to this address</p>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3">
                    <span className="min-w-0 flex-1 break-all font-mono text-xs text-white">{selected.accountAddress}</span>
                    <button onClick={() => copy(selected.accountAddress!)} className="flex-shrink-0 border border-border text-[11px] font-bold px-3 py-1.5 rounded-lg text-text hover:text-white">
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-orange/30 bg-orange/10 px-3.5 py-3 text-[11px] leading-relaxed text-orange">
                {selected.networkName
                  ? `Send ONLY ${selected.label} (${selected.networkName}) to this address. Wrong-network transfers can be lost permanently.`
                  : 'Double-check the address before sending — transfers are irreversible.'}
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Transaction Hash (TxID)</label>
                  <input
                    value={txHash} onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste the hash after sending" required disabled={submitting}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-text-dark/50 placeholder:font-sans focus:outline-none focus:border-blue"
                  />
                </div>
                {error && <p className="text-xs text-red font-semibold">{error}</p>}
                <button type="submit" disabled={submitting || !txHash.trim()} className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'I have paid'}
                </button>
                <p className="text-center text-[11px] text-textDark">Only press the button after you have sent the money.</p>
              </form>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            {status === 'REJECTED' ? (
              <>
                <p className="text-xl font-bold text-white">Deposit rejected</p>
                <p className="text-sm text-textDark mt-2">{note ?? 'Our team could not confirm your payment. Contact support for help.'}</p>
                <button
                  onClick={() => {
                    setStep(1); setAmount(''); setTxHash(''); setPromoCode('');
                    setDepositId(''); setStatus('PENDING'); setError('');
                  }}
                  className="mt-6 w-full border border-border text-sm font-bold py-3 rounded-xl text-text hover:text-white"
                >
                  Track another deposit
                </button>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-white">Waiting for confirmation</p>
                <p className="text-sm text-textDark mt-2">
                  Your payment is being checked. You will be redirected automatically once approved.
                </p>
                <p className="mt-6 inline-block text-4xl font-black tabular-nums bg-background border border-border rounded-2xl px-6 py-3">
                  {mm}:{ss}
                </p>
                <p className="mt-2 text-[11px] text-textDark">Usually confirmed within minutes. Keep this page open.</p>
                <button
                  onClick={() => {
                    setStep(1); setAmount(''); setTxHash(''); setPromoCode('');
                    setDepositId(''); setStatus('PENDING'); setError('');
                  }}
                  className="mt-6 w-full border border-border text-sm font-bold py-3 rounded-xl text-text hover:text-white"
                >
                  Track another deposit
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
