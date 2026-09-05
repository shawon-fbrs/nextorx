'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type PaymentMethod = {
  id: string;
  name: string;
  label: string;
  networkName: string;
  logoUrl: string | null;
  accountAddress: string | null;
  accountQrUrl: string | null;
  minDeposit: number;
  maxDeposit: number;
};

type Deposit = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
};

export default function DepositPage() {
  const { user, refresh } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<Deposit[]>([]);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/trade/deposit');
      const data = await res.json();
      const list: Deposit[] = data.deposits ?? [];
      const wasPending = pending.length > 0;
      const stillPending = list.filter((d) => d.status === 'PENDING');
      setPending(stillPending);
      if (wasPending && stillPending.length === 0 && list.length > 0 && list[0].status === 'VERIFIED') {
        setMessage('Deposit verified! Balance updated.');
        await refresh();
      }
    } catch {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length, refresh]);

  useEffect(() => {
    fetch('/api/trade/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        if (data.methods) {
          setMethods(data.methods.filter((m: PaymentMethod) => m.accountAddress));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMethods(false));
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (pending.length === 0) return;
    const timer = setInterval(fetchPending, 10000);
    return () => clearInterval(timer);
  }, [pending.length, fetchPending]);

  const copyAddress = async () => {
    if (!selectedMethod?.accountAddress) return;
    try {
      await navigator.clipboard.writeText(selectedMethod.accountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  const handleDeposit = async () => {
    if (!selectedMethod || !amount || !txHash) return;
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/trade/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseFloat(amount) * 100),
          method: selectedMethod.name,
          network: selectedMethod.networkName,
          txHash,
          walletAddress: selectedMethod.accountAddress,
          promoCode: promoCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Deposit failed');
      } else {
        setMessage('Deposit request submitted! We will verify and credit your balance.');
        setAmount('');
        setTxHash('');
        setPromoCode('');
        await refresh();
        fetchPending();
      }
    } catch {
      setMessage('Failed to submit deposit');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Please log in</div>
      </div>
    );
  }

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="mb-6">
          <Link href="/more" className="text-xs text-blue hover:text-blue-hover mb-2 inline-block">&larr; Back</Link>
          <h1 className="text-xl font-bold text-white">Deposit</h1>
          <p className="text-sm text-text-dark mt-1">Add funds to your account</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <p className="text-xs text-text-dark mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-white">${((user.balance || 0) / 100).toFixed(2)}</p>
        </div>

        {pending.length > 0 && (
          <div className="bg-orange/5 border border-orange/20 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-orange uppercase tracking-wider mb-2">Pending verification ({pending.length})</p>
            {pending.map((d) => (
              <div key={d.id} className="flex justify-between text-xs py-1">
                <span className="text-text">${(d.amount / 100).toFixed(2)} · {d.method}</span>
                <span className="text-text-dark">{new Date(d.createdAt).toLocaleString()}</span>
              </div>
            ))}
            <p className="text-[11px] text-text-dark mt-2">Balance updates automatically once verified.</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">1 · Select Payment Method</label>
            {loadingMethods ? (
              <div className="text-text-dark text-xs">Loading methods...</div>
            ) : methods.length === 0 ? (
              <div className="text-text-dark text-xs">No payment methods available</div>
            ) : (
              <div className="space-y-2">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    className={`w-full bg-background border rounded-xl p-3 text-left transition-colors ${
                      selectedMethod?.id === method.id ? 'border-green' : 'border-border hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {method.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={method.logoUrl} alt={method.label} className="w-9 h-9 rounded-full object-contain bg-white" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-sm font-bold text-white">
                          {method.label.slice(0, 1)}
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-white block">{method.label}</span>
                        <span className="text-[11px] text-text-dark">{method.networkName}</span>
                      </div>
                      <span className="text-[10px] text-text-dark">
                        ${(method.minDeposit / 100).toFixed(0)} - ${(method.maxDeposit / 100).toFixed(0)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedMethod && (
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-3">2 · Send to this address</p>
              <div className="flex gap-4 items-start">
                {selectedMethod.accountQrUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedMethod.accountQrUrl} alt="Deposit QR" className="w-32 h-32 rounded-xl bg-white p-1 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="bg-surface rounded-lg p-3 mb-2">
                    <p className="text-sm text-white font-mono break-all">{selectedMethod.accountAddress}</p>
                  </div>
                  <button onClick={copyAddress} className="text-[11px] font-bold text-blue hover:text-blue-hover">
                    {copied ? 'Copied!' : 'Copy address'}
                  </button>
                  <p className="text-[10px] text-text-dark mt-2">
                    Send exactly {selectedMethod.networkName} to this address. Then paste the transaction hash below.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">3 · Amount (USD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Transaction Hash (TxID)</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Paste your transaction hash"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Promo Code (Optional)</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
            />
          </div>

          {message && (
            <p className={`text-xs font-semibold ${message.includes('verified') || message.includes('submitted') ? 'text-green' : 'text-red'}`}>{message}</p>
          )}

          <button
            onClick={handleDeposit}
            disabled={loading || !selectedMethod || !amount || !txHash}
            className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}
