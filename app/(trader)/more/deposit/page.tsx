'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type PaymentMethod = {
  id: string;
  name: string;
  label: string;
  networkName: string;
  accountAddress: string | null;
  minDeposit: number;
  maxDeposit: number;
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

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const res = await fetch('/api/trade/payment-methods');
      const data = await res.json();
      if (data.methods) {
        setMethods(data.methods.filter((m: PaymentMethod) => m.accountAddress));
      }
    } catch {
      // ignore
    } finally {
      setLoadingMethods(false);
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
        setMessage('Deposit request submitted! Waiting for verification.');
        setAmount('');
        setTxHash('');
        setPromoCode('');
        await refresh();
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

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Select Payment Method</label>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-white">{method.label}</span>
                        <span className="text-[11px] text-text-dark ml-2">({method.networkName})</span>
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
              <p className="text-xs text-text-dark mb-2">Send to this address:</p>
              <div className="bg-surface rounded-lg p-3 mb-3">
                <p className="text-sm text-white font-mono break-all">{selectedMethod.accountAddress}</p>
              </div>
              <p className="text-[10px] text-text-dark">
                Send exactly {selectedMethod.networkName} to this address. Do not send from an exchange.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Amount (USD)</label>
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
            <p className={`text-xs font-semibold ${message.includes('success') || message.includes('submitted') ? 'text-green' : 'text-red'}`}>{message}</p>
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
