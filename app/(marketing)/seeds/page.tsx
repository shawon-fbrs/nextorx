'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface SeedEntry {
  day: string;
  seedHash: string;
  revealed: boolean;
  revealedAt: string | null;
  committedAt: string | null;
  createdAt: string;
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
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchSeeds = useCallback(async (p: number, f: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seeds?page=${p}&limit=15&filter=${f}`);
      if (res.ok) {
        const data = await res.json();
        setSeeds(data.seeds ?? []);
        setPagination(data.pagination ?? null);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeeds(page, filter);
  }, [page, filter, fetchSeeds]);

  const handleFilter = (f: 'all' | 'revealed' | 'pending') => {
    setFilter(f);
    setPage(1);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const now = Date.now();

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-xs text-blue font-semibold hover:underline">&larr; Home</Link>

        <div>
          <h1 className="text-2xl font-black text-foreground">Seed Commitments</h1>
          <p className="text-sm text-textDark mt-1">
            Every trading day, a random seed is generated and its SHA-256 hash is published before any trades occur.
            After the day ends, the seed is revealed so you can verify every candle was generated fairly.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 text-xs font-semibold">
          {(['all', 'revealed', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                filter === f
                  ? 'bg-blue text-white'
                  : 'bg-surface border border-border text-textDark hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Seed list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : seeds.length === 0 ? (
          <div className="text-center py-12 text-textDark text-sm">
            No seeds found. Seeds are created when trading starts.
          </div>
        ) : (
          <div className="space-y-2">
            {seeds.map((seed) => {
              const committedTime = seed.committedAt ? new Date(seed.committedAt) : new Date(seed.createdAt);
              const daysAgo = Math.floor((now - committedTime.getTime()) / 86400000);

              return (
                <div
                  key={seed.day}
                  className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-4 hover:border-border/80 transition-colors"
                >
                  {/* Day */}
                  <div className="font-mono text-sm font-bold text-foreground w-24 shrink-0">
                    {seed.day}
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    seed.revealed ? 'bg-green/15 text-green' : 'bg-orange/15 text-orange'
                  }`}>
                    {seed.revealed ? 'REVEALED' : 'PENDING'}
                  </span>

                  {/* Hash */}
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <button
                      onClick={() => copyHash(seed.seedHash)}
                      className="font-mono text-[11px] text-textDark hover:text-foreground transition-colors"
                      title="Click to copy full hash"
                    >
                      {seed.seedHash.slice(0, 16)}&hellip;{seed.seedHash.slice(-6)}
                      {copiedHash === seed.seedHash ? (
                        <span className="text-green ml-1.5">copied</span>
                      ) : null}
                    </button>
                  </div>

                  {/* Days ago */}
                  {daysAgo > 0 && (
                    <span className="text-[10px] text-textDark shrink-0">{daysAgo}d ago</span>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <Link
                      href={`/verify?day=${seed.day}`}
                      className="text-[11px] font-bold bg-blue/10 text-blue px-2.5 py-1 rounded-lg hover:bg-blue/20 transition-colors"
                    >
                      Verify
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-textDark">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} seeds)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border font-semibold disabled:opacity-40 hover:text-foreground transition-colors"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border font-semibold disabled:opacity-40 hover:text-foreground transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
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
