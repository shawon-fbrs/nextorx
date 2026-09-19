'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface SeedAsset {
  pairId: string;
  pairName: string;
  count: number;
}

interface SeedEntry {
  day: string;
  seedHash: string;
  revealed: boolean;
  revealedAt: string | null;
  committedAt: string | null;
  createdAt: string;
  assets: SeedAsset[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SeedsPage() {
  const [seeds, setSeeds] = useState<SeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'revealed' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchSeeds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15', filter });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (assetFilter) params.set('asset', assetFilter);
      const res = await fetch(`/api/seeds?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSeeds(data.seeds ?? []);
        setPagination(data.pagination ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, filter, dateFrom, dateTo, assetFilter]);

  useEffect(() => { fetchSeeds(); }, [fetchSeeds]);

  const handleFilter = (f: 'all' | 'revealed' | 'pending') => { setFilter(f); setPage(1); };
  const handleSearch = () => { setPage(1); fetchSeeds(); };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const now = Date.now();

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="text-xs text-blue font-semibold hover:underline">&larr; Home</Link>

        <div>
          <h1 className="text-2xl font-black text-foreground">Seed Commitments</h1>
          <p className="text-sm text-textDark mt-1">
            Every trading day, a random seed is generated and its SHA-256 hash is published before any trades.
            After the day ends, the seed is revealed so you can verify every candle was generated fairly.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] font-semibold text-textDark uppercase tracking-wider mb-1 block">Asset</label>
              <input type="text" value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}
                placeholder="e.g. EURUSD"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] font-semibold text-textDark uppercase tracking-wider mb-1 block">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue [color-scheme:dark]" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] font-semibold text-textDark uppercase tracking-wider mb-1 block">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue [color-scheme:dark]" />
            </div>
            <button onClick={handleSearch}
              className="bg-blue hover:bg-blue/80 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
              Search
            </button>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            {(['all', 'revealed', 'pending'] as const).map((f) => (
              <button key={f} onClick={() => handleFilter(f)}
                className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                  filter === f ? 'bg-blue text-white' : 'bg-background border border-border text-textDark hover:text-foreground'
                }`}>{f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />))}
          </div>
        ) : seeds.length === 0 ? (
          <div className="text-center py-12 text-textDark text-sm">No seeds found for the selected filters.</div>
        ) : (
          <div className="space-y-2">
            {seeds.map((seed) => {
              const committedTime = seed.committedAt ? new Date(seed.committedAt) : new Date(seed.createdAt);
              const daysAgo = Math.floor((now - committedTime.getTime()) / 86400000);
              return (
                <div key={seed.day} className="bg-surface border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 sm:w-44 shrink-0">
                      <div className="font-mono text-sm font-bold text-foreground">{seed.day}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        seed.revealed ? 'bg-green/15 text-green' : 'bg-orange/15 text-orange'
                      }`}>{seed.revealed ? 'REVEALED' : 'PENDING'}</span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
                      {seed.assets.length > 0 ? seed.assets.map((a) => (
                        <span key={a.pairId} className="text-[10px] font-semibold bg-background border border-border px-2 py-0.5 rounded-md text-textDark">
                          {a.pairName} <span className="text-textDark/50">({a.count})</span>
                        </span>
                      )) : (
                        <span className="text-[10px] text-textDark/50">No candle data</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {daysAgo > 0 && <span className="text-[10px] text-textDark">{daysAgo}d ago</span>}
                      <button onClick={() => copyHash(seed.seedHash)}
                        className="font-mono text-[10px] text-textDark hover:text-foreground transition-colors max-w-[140px] truncate"
                        title="Click to copy full hash">
                        {seed.seedHash.slice(0, 12)}...{copiedHash === seed.seedHash ? <span className="text-green">copied</span> : ''}
                      </button>
                      <Link href={`/verify?day=${seed.day}`}
                        className="text-[11px] font-bold bg-blue/10 text-blue px-2.5 py-1 rounded-lg hover:bg-blue/20 transition-colors">
                        Verify
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-textDark">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} seeds)</span>
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
            <li>Before each trading day, a random seed is generated and its SHA-256 hash is published here.</li>
            <li>The hash is committed <strong>before any trades</strong> &mdash; the platform cannot change the seed after seeing positions.</li>
            <li>After the day ends, the full seed is revealed and you can verify every candle in your browser.</li>
            <li>Each candle is linked in a hash chain &mdash; any tampering breaks the chain and is instantly detectable.</li>
          </ol>
          <p className="mt-2">
            <Link href="/verify" className="text-blue font-semibold hover:underline">Open Verify Tool &rarr;</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
