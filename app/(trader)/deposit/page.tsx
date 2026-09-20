'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

type MethodRow = {
  id: string;
  name: string;
  label: string;
  minDeposit: number;
  maxDeposit: number;
};

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refresh } = useAuth();
  const [amount, setAmount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [limits, setLimits] = useState({ min: 1000, max: 10000000 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnStatus, setReturnStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED' | null>(null);
  const [returnNote, setReturnNote] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const pollStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/trade/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const methods: MethodRow[] = data.methods ?? [];
        const gw = methods.find((m) => m.name === 'REDOTPAY');
        if (gw) setLimits({ min: gw.minDeposit, max: gw.maxDeposit });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('status') === 'return' && searchParams.get('order')) {
      setReturnOrderId(searchParams.get('order'));
      setReturnStatus('PENDING');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!returnOrderId || pollStarted.current) return;
    pollStarted.current = true;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/trade/deposit?id=${returnOrderId}`);
        const data = await res.json();
        const st = data.deposit?.status ?? '';
        if (st === 'VERIFIED') {
          clearInterval(poll);
          await refresh();
          router.push('/trade/real');
          router.refresh();
        } else if (st === 'REJECTED') {
          clearInterval(poll);
          setReturnStatus('REJECTED');
          setReturnNote(data.deposit?.note ?? null);
        } else {
          setReturnStatus('PENDING');
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [returnOrderId, router, refresh]);

  if (!user) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Please log in</div>
      </div>
    );
  }

  const checkStatus = async () => {
    if (!returnOrderId || syncing) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/trade/deposit/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: returnOrderId }),
      });
      const data = await res.json();
      if (data.status === 'VERIFIED') {
        await refresh();
        router.push('/trade/real');
        router.refresh();
      } else if (data.status === 'REJECTED') {
        setReturnStatus('REJECTED');
        setReturnNote(data.note ?? null);
      } else if (!res.ok) {
        setSyncMsg(data.error || 'Could not check status yet');
      } else {
        setSyncMsg('Still pending at provider — check again in a minute');
      }
    } catch {
      setSyncMsg('Could not check status yet');
    } finally {
      setSyncing(false);
    }
  };

  const minUsd = limits.min / 100;
  const maxUsd = limits.max / 100;
  const amountUsd = Number(amount);
  const validAmount = Number.isFinite(amountUsd) && amountUsd >= minUsd && amountUsd <= maxUsd;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validAmount || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/trade/deposit/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amountUsd * 100),
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.error || 'Could not start checkout');
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError('Could not start checkout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto">
        <Link href="/trade/demo" className="text-xs text-blue font-semibold">← Back</Link>

        {returnOrderId ? (
          <div className="mt-6 bg-surface border border-border rounded-2xl p-6 text-center space-y-3">
            {returnStatus === 'REJECTED' ? (
              <>
                <p className="text-base font-bold text-red">Payment failed</p>
                <p className="text-xs text-textDark">{returnNote ?? 'The payment did not complete.'}</p>
                <button
                  onClick={() => { setReturnOrderId(null); setReturnStatus(null); pollStarted.current = false; router.replace('/deposit'); }}
                  className="mt-2 bg-blue hover:bg-blue/80 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto w-10 h-10 rounded-full border-2 border-blue border-t-transparent animate-spin" />
                <p className="text-base font-bold text-foreground">Confirming your payment…</p>
                <p className="text-xs text-textDark">This usually takes under a minute. You will be redirected automatically once confirmed.</p>
                <button
                  onClick={checkStatus} disabled={syncing}
                  className="mt-1 text-xs font-bold text-blue hover:underline disabled:opacity-50"
                >
                  {syncing ? 'Checking…' : 'I’ve paid — check status now'}
                </button>
                {syncMsg && <p className="text-[11px] text-textDark">{syncMsg}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <div className="mb-4">
              <p className="text-xs text-text-dark mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-foreground">${((user.balance || 0) / 100).toFixed(2)}</p>
            </div>
            <h2 className="text-base font-bold text-foreground mb-1">Deposit with crypto</h2>
            <p className="text-[11px] text-textDark mb-4">Pay with USDT (and more) on our secure checkout page. Funds are credited automatically after confirmation.</p>
            <form onSubmit={submit} className="space-y-5 bg-surface border border-border rounded-2xl p-6">
              <div>
                <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Amount (USD)</label>
                <input
                  type="number" min={minUsd} max={maxUsd} step="any" required autoFocus
                  placeholder={`Min ${minUsd}`}
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-2xl font-bold text-foreground placeholder:text-text-dark/50 focus:outline-none focus:border-blue tabular-nums"
                />
                <p className="text-[11px] text-textDark mt-1">Min ${minUsd.toFixed(2)}{maxUsd < 1000000 ? ` · Max $${maxUsd.toFixed(2)}` : ''}</p>
                {amount.trim() !== '' && !validAmount && (
                  <p className="text-[11px] text-red mt-1">Enter an amount between ${minUsd.toFixed(2)} and ${maxUsd.toFixed(2)}.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.filter((n) => n >= minUsd && n <= maxUsd).map((n) => (
                  <button
                    key={n} type="button" onClick={() => setAmount(String(n))}
                    className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-bold text-textDark hover:text-foreground transition-colors"
                  >
                    ${n}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Promo code (optional)</label>
                <input
                  value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="PROMO2024"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold tracking-widest text-foreground placeholder:text-text-dark/50 focus:outline-none focus:border-blue"
                />
              </div>
              {error && <p className="text-[11px] text-red">{error}</p>}
              <button
                type="submit" disabled={!validAmount || submitting}
                className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? 'Opening secure checkout…' : `Deposit $${Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd.toFixed(2) : '0.00'}`}
              </button>
              <p className="text-[10px] text-textDark text-center">You will be redirected to our payment partner to complete the payment, then brought back here automatically.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div className="bg-background text-text h-full flex items-center justify-center"><div className="text-text-dark text-sm">Loading…</div></div>}>
      <DepositContent />
    </Suspense>
  );
}
