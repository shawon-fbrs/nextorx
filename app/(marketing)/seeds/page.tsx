'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface SeedEntry {
  day: string;
  pairId: string;
  pairName: string;
  seedHash: string;
  status: 'REVEALED' | 'PENDING' | 'NONE';
  revealedAt: string | null;
  committedAt: string | null;
  createdAt: string;
}

interface PairOption { id: string; name: string; }

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

const STATUS_STYLES: Record<string, string> = {
  REVEALED: 'bg-green/15 text-green',
  PENDING: 'bg-orange/15 text-orange',
  NONE: 'bg-white/5 text-textDark',
};

const STATUS_LABELS: Record<string, string> = {
  REVEALED: 'REVEALED',
  PENDING: 'PENDING',
  NONE: 'NO SEED',
};

export default function SeedsPage() {
  const [seeds, setSeeds] = useState<SeedEntry[]>([]);
  const [pairs, setPairs] = useState<PairOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'revealed' | 'pending' | 'unverifiable'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [assetFilter, setAssetFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [validDates, setValidDates] = useState<string[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const fetchSeeds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', filter });
      if (assetFilter) params.set('asset', assetFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await fetch(`/api/seeds?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSeeds(data.seeds ?? []);
        setPairs(data.pairs ?? []);
        setPagination(data.pagination ?? null);
        setValidDates(data.validDates ?? []);
        setAllDates(data.allDates ?? []);
      }
    } catch {} finally { setLoading(false); }
  }, [page, filter, assetFilter, dateFrom, dateTo]);

  useEffect(() => { fetchSeeds(); }, [fetchSeeds]);

  const handleFilter = (f: 'all' | 'revealed' | 'pending' | 'unverifiable') => { setFilter(f); setPage(1); };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const dayGroups = new Map<string, SeedEntry[]>();
  for (const s of seeds) {
    if (!dayGroups.has(s.day)) dayGroups.set(s.day, []);
    dayGroups.get(s.day)!.push(s);
  }

  const today = new Date().toISOString().slice(0, 10);
  const earliestDate = allDates.length > 0 ? allDates[allDates.length - 1] : today;
  const latestDate = allDates.length > 0 ? allDates[0] : today;

  const totalRevealed = seeds.filter((s) => s.status === 'REVEALED').length;
  const totalPending = seeds.filter((s) => s.status === 'PENDING').length;
  const totalNone = seeds.filter((s) => s.status === 'NONE').length;

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="text-xs text-blue font-semibold hover:underline">&larr; Home</Link>

        <div>
          <h1 className="text-2xl font-black text-foreground">Seed Commitments</h1>
          <p className="text-sm text-textDark mt-1">
            Each asset has its own random seed per trading day. The SHA-256 hash is published before any trades.
            After the day ends, the seed is revealed so you can verify every candle was generated fairly.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <div className="text-lg font-black text-green">{totalRevealed}</div>
            <div className="text-[10px] font-semibold text-textDark uppercase">Revealed</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <div className="text-lg font-black text-orange">{totalPending}</div>
            <div className="text-[10px] font-semibold text-textDark uppercase">Pending</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <div className="text-lg font-black text-textDark">{totalNone}</div>
            <div className="text-[10px] font-semibold text-textDark uppercase">No Seed</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-semibold text-textDark uppercase tracking-wider mb-1 block">Asset</label>
              <select value={assetFilter} onChange={(e) => { setAssetFilter(e.target.value); setPage(1); }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue [color-scheme:dark]">
                <option value="">All assets</option>
                {pairs.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] font-semibold text-textDark uppercase tracking-wider mb-1 block">From</label>
              <input type="date" value={dateFrom} min={earliestDate} max={today}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue [color-scheme:dark]" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] font-semibold text-textDark uppercase tracking-wider mb-1 block">To</label>
              <input type="date" value={dateTo} min={earliestDate} max={today}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue [color-scheme:dark]" />
            </div>
          </div>
          <div className="flex gap-2 text-xs font-semibold flex-wrap">
            {(['all', 'revealed', 'pending', 'unverifiable'] as const).map((f) => (
              <button key={f} onClick={() => handleFilter(f)}
                className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                  filter === f ? 'bg-blue text-white' : 'bg-background border border-border text-textDark hover:text-foreground'
                }`}>{f === 'unverifiable' ? 'No Seed' : f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />))}
          </div>
        ) : dayGroups.size === 0 ? (
          <div className="text-center py-12 text-textDark text-sm">No data found for the selected filters.</div>
        ) : (
          <div className="space-y-3">
            {Array.from(dayGroups.entries()).map(([day, entries]) => {
              const isExpanded = expandedDays.has(day);
              const revealedCount = entries.filter((e) => e.status === 'REVEALED').length;
              const pendingCount = entries.filter((e) => e.status === 'PENDING').length;
              const noneCount = entries.filter((e) => e.status === 'NONE').length;
              const allRevealed = revealedCount === entries.length;
              const allNone = noneCount === entries.length;
              const daysAgo = Math.floor((Date.now() - Date.parse(day)) / 86400000);

              return (
                <div key={day} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <button onClick={() => toggleDay(day)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-bold text-foreground">{day}</div>
                      {daysAgo > 0 && <span className="text-[10px] text-textDark">{daysAgo}d ago</span>}
                      {allRevealed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green/15 text-green">ALL REVEALED</span>}
                      {allNone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-textDark">NO SEEDS</span>}
                      {!allRevealed && !allNone && (
                        <div className="flex gap-1.5">
                          {revealedCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green/15 text-green">{revealedCount}R</span>}
                          {pendingCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange/15 text-orange">{pendingCount}P</span>}
                          {noneCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-textDark">{noneCount}N</span>}
                        </div>
                      )}
                    </div>
                    <svg className={`w-4 h-4 text-textDark transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border">
                      {entries.map((entry) => (
                        <div key={`${entry.day}-${entry.pairId}`}
                          className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-foreground">{entry.pairName}</span>
                            <span className="text-[10px] text-textDark font-mono">{entry.pairId}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[entry.status]}`}>
                              {STATUS_LABELS[entry.status]}
                            </span>
                            {entry.status === 'REVEALED' && entry.seedHash && (
                              <button onClick={() => copyHash(entry.seedHash)}
                                className="font-mono text-[10px] text-textDark hover:text-foreground transition-colors max-w-[100px] truncate"
                                title="Click to copy full hash">
                                {entry.seedHash.slice(0, 10)}...
                                {copiedHash === entry.seedHash && <span className="text-green ml-1">copied</span>}
                              </button>
                            )}
                            {entry.status === 'REVEALED' && (
                              <Link href={`/verify?day=${entry.day}&asset=${entry.pairId}`}
                                className="text-[11px] font-bold bg-blue/10 text-blue px-2.5 py-1 rounded-lg hover:bg-blue/20 transition-colors">
                                Verify
                              </Link>
                            )}
                            {entry.status === 'PENDING' && (
                              <span className="text-[11px] text-textDark font-semibold px-2.5 py-1">Reveals after day ends</span>
                            )}
                            {entry.status === 'NONE' && (
                              <span className="text-[11px] text-textDark font-semibold px-2.5 py-1">No seed recorded</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-textDark">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border font-semibold disabled:opacity-40 hover:text-foreground transition-colors">
                &larr; Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border font-semibold disabled:opacity-40 hover:text-foreground transition-colors">
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-4 text-xs text-textDark space-y-2">
          <h3 className="font-bold text-foreground text-sm">How it works</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Before each trading day, a unique random seed is generated per asset and its SHA-256 hash is published.</li>
            <li>The hash is committed <strong>before any trades</strong> &mdash; the platform cannot change the seed after seeing positions.</li>
            <li>After the day ends, the full seed is revealed and you can verify every candle in your browser.</li>
            <li>Each asset has its own independent seed &mdash; no shared randomness between assets.</li>
          </ol>
          <p className="mt-2">
            <Link href="/verify" className="text-blue font-semibold hover:underline">Open Verify Tool &rarr;</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
