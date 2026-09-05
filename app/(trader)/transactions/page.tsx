'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Entry = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT_CREDIT: 'Deposit',
  WITHDRAWAL_HOLD: 'Withdrawal hold',
  WITHDRAWAL_RELEASE: 'Withdrawal returned',
  WITHDRAWAL_DEBIT: 'Withdrawal paid',
  TRADE_HOLD: 'Trade stake',
  TRADE_RELEASE: 'Trade refunded',
  TRADE_WIN: 'Trade won',
  TRADE_LOST: 'Trade lost',
  PROMO_CREDIT: 'Promo',
  PROMO_CONVERT: 'Promo converted',
  BONUS_CREDIT: 'Bonus',
  BONUS_CONVERT: 'Bonus converted',
  BONUS_EXPIRE: 'Bonus expired',
  ADMIN_ADJUSTMENT: 'Admin adjustment',
};

export default function TransactionsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trade/balance?limit=100')
      .then((r) => r.json())
      .then((d) => setEntries(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto">
        <Link href="/trade/demo" className="text-xs text-blue font-semibold">← Back</Link>
        <h1 className="text-xl font-bold text-white mt-2">Transactions</h1>
        <p className="text-sm text-text-dark mt-1">Every movement of your real balance.</p>

        <div className="mt-4 space-y-2">
          {entries.length === 0 ? (
            <p className="text-xs text-text-dark text-center py-8">No transactions yet.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">{TYPE_LABELS[e.type] ?? e.type}</p>
                  <p className="text-[11px] text-text-dark truncate">{e.description ?? ''}</p>
                  <p className="text-[10px] text-text-dark">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ml-3 ${e.amount >= 0 ? 'text-green' : 'text-red'}`}>
                  {e.amount >= 0 ? '+' : '−'}${(Math.abs(e.amount) / 100).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
