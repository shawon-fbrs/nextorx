'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Trade = {
  id: string;
  direction: string;
  amount: number;
  payoutPercent: string;
  durationSeconds: number;
  openPrice: string;
  closePrice: string | null;
  status: string;
  profit: number | null;
  settledAt: string | null;
  createdAt: string;
  pair: { id: string; name: string; category: string };
};

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'WON', label: 'Won' },
  { id: 'LOST', label: 'Lost' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING', label: 'Pending' },
] as const;

function formatAmount(cents: number) {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trade/trades?limit=200');
      const data = await res.json();
      if (data.trades) setTrades(data.trades);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? trades : trades.filter((t) => t.status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = {
    total: trades.length,
    won: trades.filter((t) => t.status === 'WON').length,
    lost: trades.filter((t) => t.status === 'LOST').length,
    active: trades.filter((t) => t.status === 'ACTIVE' || t.status === 'PENDING').length,
    totalProfit: trades.reduce((s, t) => s + (t.profit ?? 0), 0),
  };

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="mb-6">
          <Link href="/more" className="text-xs text-blue hover:text-blue-hover mb-2 inline-block">&larr; Back</Link>
          <h1 className="text-xl font-bold text-white">Trade History</h1>
          <p className="text-sm text-text-dark mt-1">Your recent trades</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] text-text-dark uppercase">Total</p>
            <p className="text-lg font-bold text-white">{summary.total}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] text-text-dark uppercase">Won</p>
            <p className="text-lg font-bold text-green">{summary.won}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] text-text-dark uppercase">Lost</p>
            <p className="text-lg font-bold text-red">{summary.lost}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] text-text-dark uppercase">Active</p>
            <p className="text-lg font-bold text-blue">{summary.active}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-green text-white'
                  : 'bg-surface border border-border text-text-dark hover:text-white'
              }`}
            >
              {f.label}
              {f.id !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  {trades.filter((t) => t.status === f.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-dark text-sm">Loading trades...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-white">No trades yet</p>
            <p className="text-xs text-text-dark mt-1">Start trading to see your history here</p>
            <Link href="/trade/demo" className="mt-4 inline-block bg-green hover:bg-green-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
              Start Trading
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[10px] font-semibold text-text-dark uppercase tracking-wider px-4 py-2.5">Pair</th>
                    <th className="text-left text-[10px] font-semibold text-text-dark uppercase tracking-wider px-4 py-2.5">Dir</th>
                    <th className="text-right text-[10px] font-semibold text-text-dark uppercase tracking-wider px-4 py-2.5">Amount</th>
                    <th className="text-right text-[10px] font-semibold text-text-dark uppercase tracking-wider px-4 py-2.5">Profit</th>
                    <th className="text-center text-[10px] font-semibold text-text-dark uppercase tracking-wider px-4 py-2.5">Duration</th>
                    <th className="text-center text-[10px] font-semibold text-text-dark uppercase tracking-wider px-4 py-2.5">Status</th>
                    <th className="text-right text-[10px] font-semibold text-text-dark uppercase tracking-wider px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((trade) => (
                    <tr key={trade.id} className="border-b border-border/50 last:border-0 hover:bg-background/50">
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-white">{trade.pair.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${trade.direction === 'UP' ? 'text-green' : 'text-red'}`}>
                          {trade.direction === 'UP' ? '▲' : '▼'} {trade.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-white">{formatAmount(trade.amount)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {trade.profit !== null ? (
                          <span className={`text-xs font-bold ${trade.profit >= 0 ? 'text-green' : 'text-red'}`}>
                            {trade.profit >= 0 ? '+' : '-'}{formatAmount(trade.profit)}
                          </span>
                        ) : (
                          <span className="text-xs text-text-dark">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-text-dark">{formatDuration(trade.durationSeconds)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          trade.status === 'WON' ? 'bg-green/15 text-green' :
                          trade.status === 'LOST' ? 'bg-red/15 text-red' :
                          trade.status === 'ACTIVE' ? 'bg-blue/15 text-blue' :
                          'bg-border/30 text-text-dark'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-[11px] text-white">{formatDate(trade.createdAt)}</div>
                        <div className="text-[10px] text-text-dark">{formatTime(trade.createdAt)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] text-text-dark">
                  {filtered.length} trades
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border text-text-dark hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-text-dark px-2">{page}/{totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border text-text-dark hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
