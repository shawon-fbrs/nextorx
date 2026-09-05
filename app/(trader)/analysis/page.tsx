'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ServerTrade = {
  id: string;
  direction: string;
  amount: number;
  status: string;
  profit: number | null;
  payoutPercent: number | string;
  createdAt: string;
  durationSeconds: number;
  pair: { name: string };
};

export default function AnalysisPage() {
  const [trades, setTrades] = useState<ServerTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trade/trades?limit=200')
      .then((r) => r.json())
      .then((d) => setTrades(d.trades ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const settled = trades.filter((t) => t.status === 'WON' || t.status === 'LOST');
  const wins = settled.filter((t) => t.status === 'WON');
  const gross = settled.reduce((s, t) => s + (t.profit ?? -t.amount), 0);
  const winRate = settled.length > 0 ? Math.round((wins.length / settled.length) * 100) : 0;
  const volume = settled.reduce((s, t) => s + t.amount, 0);

  const byPair = new Map<string, { trades: number; profit: number }>();
  for (const t of settled) {
    const name = t.pair?.name ?? '?';
    const cur = byPair.get(name) ?? { trades: 0, profit: 0 };
    cur.trades += 1;
    cur.profit += t.profit ?? -t.amount;
    byPair.set(name, cur);
  }
  const pairRows = [...byPair.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 8);

  const byDay = new Map<string, number>();
  for (const t of settled) {
    const day = new Date(t.createdAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + (t.profit ?? -t.amount));
  }
  const dayRows = [...byDay.entries()].sort().slice(-14);
  const maxAbs = Math.max(1, ...dayRows.map(([, v]) => Math.abs(v)));

  if (loading) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <Link href="/trade/demo" className="text-xs text-blue font-semibold">← Back</Link>
        <h1 className="text-xl font-bold text-white mt-2">Analysis</h1>
        <p className="text-sm text-text-dark mt-1">Your performance from settled trades.</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-dark uppercase tracking-wider">Net P&L</p>
            <p className={`text-2xl font-bold ${gross >= 0 ? 'text-green' : 'text-red'}`}>
              {gross >= 0 ? '+' : '−'}${(Math.abs(gross) / 100).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-dark uppercase tracking-wider">Win Rate</p>
            <p className="text-2xl font-bold text-white">{winRate}%</p>
            <p className="text-[11px] text-text-dark">{wins.length}/{settled.length} won</p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-dark uppercase tracking-wider">Volume</p>
            <p className="text-2xl font-bold text-white">${(volume / 100).toFixed(2)}</p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-dark uppercase tracking-wider">Trades</p>
            <p className="text-2xl font-bold text-white">{settled.length}</p>
          </div>
        </div>

        {dayRows.length > 0 && (
          <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs font-bold text-white mb-3">Daily P&L (last 14 days)</p>
            <div className="flex items-end gap-1 h-28">
              {dayRows.map(([day, v]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${day}: $${(v / 100).toFixed(2)}`}>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-sm ${v >= 0 ? 'bg-green' : 'bg-red'}`}
                      style={{ height: `${Math.max(4, (Math.abs(v) / maxAbs) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[8px] text-text-dark">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pairRows.length > 0 && (
          <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs font-bold text-white mb-2">Best & Worst Assets</p>
            {pairRows.map(([name, r]) => (
              <div key={name} className="flex justify-between py-1.5 border-b border-border/50 last:border-b-0">
                <span className="text-xs text-white font-semibold">{name} <span className="text-textDark font-normal">· {r.trades}</span></span>
                <span className={`text-xs font-bold ${r.profit >= 0 ? 'text-green' : 'text-red'}`}>
                  {r.profit >= 0 ? '+' : '−'}${(Math.abs(r.profit) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {settled.length === 0 && (
          <p className="text-xs text-text-dark text-center py-8">No settled trades yet. Your stats appear here.</p>
        )}
      </div>
    </div>
  );
}
