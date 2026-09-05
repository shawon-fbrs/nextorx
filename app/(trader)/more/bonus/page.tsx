'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type BonusEntry = {
  id: string;
  type: string;
  amount: number;
  bonusBalanceAfter: number | null;
  description: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  BONUS_CREDIT: 'Bonus added',
  BONUS_CONVERT: 'Converted to real balance',
  BONUS_EXPIRE: 'Bonus expired',
  PROMO_CREDIT: 'Promo credited',
  PROMO_CONVERT: 'Promo converted',
};

export default function BonusPage() {
  const [data, setData] = useState<{
    bonusBalance: number;
    turnoverRequired: number;
    turnoverDone: number;
    turnoverProgress: number;
    bonusExpiresAt: string | null;
    history: BonusEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/account/bonus')
      .then((r) => r.json())
      .then((d) => setData(d))
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

  const progress = data?.turnoverProgress ?? 0;

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto">
        <Link href="/more" className="text-xs text-blue font-semibold">← Back</Link>
        <h1 className="text-xl font-bold text-white mt-2">Bonus Wallet</h1>
        <p className="text-sm text-text-dark mt-1">Bonuses convert to real balance after wagering.</p>

        <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
          <p className="text-xs text-text-dark uppercase tracking-wider">Bonus Balance</p>
          <p className="text-3xl font-bold text-white">${(((data?.bonusBalance ?? 0)) / 100).toFixed(2)}</p>
          {(data?.turnoverRequired ?? 0) > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-text-dark mb-1">
                <span>Wagering ${((data?.turnoverDone ?? 0) / 100).toFixed(2)} of ${((data?.turnoverRequired ?? 0) / 100).toFixed(2)}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-green rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              {data?.bonusExpiresAt && (
                <p className="text-[11px] text-orange mt-2">Expires {new Date(data.bonusExpiresAt).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </div>

        <h2 className="text-sm font-bold text-white mt-6 mb-3">Bonus Activity</h2>
        {(data?.history.length ?? 0) === 0 ? (
          <p className="text-xs text-text-dark">No bonus activity yet. Use a promo code on deposit or invite friends.</p>
        ) : (
          <div className="space-y-2">
            {data?.history.map((e) => (
              <div key={e.id} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{TYPE_LABELS[e.type] ?? e.type}</p>
                  <p className="text-[11px] text-text-dark">{e.description ?? ''}</p>
                  <p className="text-[10px] text-text-dark">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
                {e.bonusBalanceAfter != null && (
                  <p className="text-xs font-mono text-textDark">bal ${(e.bonusBalanceAfter / 100).toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
