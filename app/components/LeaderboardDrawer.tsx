'use client';

import { useCallback, useEffect, useState } from 'react';

interface Earner {
  userId: string;
  name: string;
  nickname: string | null;
  net: number;
  wins: number;
  played: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const RANK_STYLE = [
  'bg-orange/20 text-orange border border-orange/40',
  'bg-text/10 text-text border border-border',
  'bg-orange/10 text-orange/80 border border-orange/20',
];

function Row({ e, rank, me }: { e: Earner; rank: number; me: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 ${me ? 'bg-blue/5' : ''}`}>
      <div className="w-7 text-center flex-shrink-0">
        {rank < 3 ? (
          <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-[11px] font-black ${RANK_STYLE[rank]}`}>{rank + 1}</span>
        ) : (
          <span className="text-sm font-bold text-textDark">{rank + 1}</span>
        )}
      </div>
      <div className="w-9 h-9 rounded-full bg-blue/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-blue">{initials(e.nickname || e.name)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {e.nickname || e.name}
          {me && <span className="ml-1.5 text-[10px] font-bold text-blue">you</span>}
        </p>
        <p className="text-[11px] text-textDark">{e.wins} win{e.wins === 1 ? '' : 's'} · {e.played} played</p>
      </div>
      <p className={`text-sm font-bold ${e.net >= 0 ? 'text-green' : 'text-red'}`}>
        {e.net >= 0 ? '+' : '−'}${(Math.abs(e.net) / 100).toFixed(2)}
      </p>
    </div>
  );
}

export function LeaderboardDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [top, setTop] = useState<Earner[]>([]);
  const [my, setMy] = useState<Earner | null>(null);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) return;
      const data = await res.json();
      setTop(data.top ?? []);
      setMy(data.my ?? null);
      setMyRank(data.myRank ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      load();
    } else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [open, load]);

  if (!open && !visible) return null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[120] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`fixed top-0 bottom-0 left-0 z-[130] w-[360px] max-w-[92vw] bg-background border-r border-border flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-foreground">Leaderboard</h3>
            <div className="flex items-center gap-1">
              <button onClick={load} title="Refresh"
                className="w-7 h-7 flex items-center justify-center text-text hover:text-foreground rounded-lg hover:bg-surface transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center text-text hover:text-foreground rounded-lg hover:bg-surface transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-dark">Top earners by net profit today</p>
            <span className="text-[10px] font-bold text-orange bg-orange/10 px-2.5 py-1 rounded-full">Resets at midnight</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && top.length === 0 ? (
            <p className="text-xs text-text-dark text-center py-10">Loading…</p>
          ) : (
            <>
              {my && (
                <div className="bg-surface border border-blue/30 rounded-xl overflow-hidden mb-4">
                  <div className="px-4 py-2 border-b border-border flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground">Your position</span>
                    <span className="text-xs font-bold text-blue">Rank #{myRank}</span>
                  </div>
                  <Row e={my} rank={myRank - 1} me />
                </div>
              )}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-xs font-bold text-foreground">Top {top.length}</span>
                </div>
                {top.length === 0 ? (
                  <p className="text-xs text-text-dark text-center py-10">
                    {my ? "No profitable traders yet today — you're early." : 'No settled trades yet today. Place a trade to claim the top spot.'}
                  </p>
                ) : (
                  top.map((e, i) => <Row key={e.userId} e={e} rank={i} me={!!my && e.userId === my.userId} />)
                )}
              </div>
              <p className="text-[11px] text-textDark text-center mt-3">Net = payouts − losses from settled trades today.</p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
