'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SeedEntry {
  day: string;
  seedHash: string;
  revealed: boolean;
  revealedAt: string | null;
  committedAt: string | null;
  gistUrl: string | null;
  createdAt: string;
}

export default function SeedsPage() {
  const [seeds, setSeeds] = useState<SeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'revealed' | 'pending'>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/seeds')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.seeds) setSeeds(data.seeds);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = seeds.filter((s) => {
    if (filter === 'revealed') return s.revealed;
    if (filter === 'pending') return !s.revealed;
    return true;
  });

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const now = Date.now();
  const revealedCount = seeds.filter((s) => s.revealed).length;
  const pendingCount = seeds.length - revealedCount;

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="text-xs text-blue font-semibold hover:underline">← Home</Link>

        <div>
          <h1 className="text-2xl font-black text-foreground">Seed Commitments</h1>
          <p className="text-sm text-textDark mt-1">
            Every trading day, a random seed is generated and its SHA-256 hash is published here before any trades occur.
            After the day ends, the seed is revealed so you can verify every candle was generated fairly.
          </p>
        </div>

        <div className="flex gap-2 text-xs font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filter === 'all' ? 'bg-blue text-white' : 'bg-surface border border-border text-textDark hover:text-foreground'}`}
          >
            All ({seeds.length})
          </button>
          <button
            onClick={() => setFilter('revealed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filter === 'revealed' ? 'bg-green text-white' : 'bg-surface border border-border text-textDark hover:text-foreground'}`}
          >
            Revealed ({revealedCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filter === 'pending' ? 'bg-orange text-white' : 'bg-surface border border-border text-textDark hover:text-foreground'}`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-textDark text-sm">
            {seeds.length === 0 ? 'No seeds published yet. Seeds are created when the first trading day starts.' : 'No seeds match this filter.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((seed) => {
              const committedTime = seed.committedAt ? new Date(seed.committedAt) : new Date(seed.createdAt);
              const revealedTime = seed.revealedAt ? new Date(seed.revealedAt) : null;
              const daysAgo = Math.floor((now - committedTime.getTime()) / 86400000);

              return (
                <div
                  key={seed.day}
                  className="bg-surface border border-border rounded-xl p-4 hover:border-border/80 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Day + Status */}
                    <div className="flex items-center gap-3 sm:w-40">
                      <div className="text-lg font-black text-foreground font-mono">{seed.day}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${seed.revealed ? 'bg-green/15 text-green' : 'bg-orange/15 text-orange'}`}>
                        {seed.revealed ? 'REVEALED' : 'PENDING'}
                      </span>
                    </div>

                    {/* Hash */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-textDark uppercase tracking-wider">Hash:</span>
                        <button
                          onClick={() => copyHash(seed.seedHash)}
                          className="font-mono text-xs text-textDark hover:text-foreground truncate max-w-[320px] transition-colors"
                          title="Click to copy"
                        >
                          {seed.seedHash.slice(0, 20)}…{seed.seedHash.slice(-8)}
                          {copiedHash === seed.seedHash ? (
                            <span className="text-green ml-1">copied!</span>
                          ) : (
                            <span className="text-textDark/50 ml-1">⧉</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="text-[10px] text-textDark space-y-0.5 sm:text-right sm:w-36">
                      <div>Committed: {committedTime.toLocaleDateString()} {committedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {revealedTime && (
                        <div>Revealed: {revealedTime.toLocaleDateString()} {revealedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                      {daysAgo > 0 && <div>{daysAgo}d ago</div>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 sm:flex-col">
                      <Link
                        href={`/verify?day=${seed.day}`}
                        className="text-[11px] font-bold bg-blue/10 text-blue px-3 py-1.5 rounded-lg hover:bg-blue/20 transition-colors text-center"
                      >
                        Verify
                      </Link>
                      <a
                        href={`/seeds/nextorx-seed-${seed.day}.json`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold bg-surface-hover text-textDark px-3 py-1.5 rounded-lg hover:bg-border/50 transition-colors text-center"
                      >
                        JSON
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-4 text-xs text-textDark space-y-2">
          <h3 className="font-bold text-foreground text-sm">How it works</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Before each trading day, a 32-byte random seed is generated and its SHA-256 hash is published here.</li>
            <li>The hash is committed <strong>before any trades</strong> — the platform cannot change the seed after seeing positions.</li>
            <li>After the day ends, the full seed is revealed and you can verify every candle in your browser.</li>
            <li>Each candle is also linked in a hash chain — any tampering breaks the chain and is instantly detectable.</li>
          </ol>
          <p className="mt-2">
            <Link href="/verify" className="text-blue font-semibold hover:underline">Open Verify Tool →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
