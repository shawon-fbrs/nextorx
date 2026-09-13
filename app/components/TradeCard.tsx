'use client';

import { useState, useEffect } from 'react';

export interface TradeCardData {
  id: string | number;
  symbol: string;
  pairId?: string;
  type: 'up' | 'down';
  amount: number;
  payout: number;
  payoutPercent?: number;
  profit: number;
  time: string;
  status: 'active' | 'won' | 'lost' | string;
  openPrice?: number;
  closePrice?: number;
  expiresAt?: number;
  timestamp?: number;
}

export interface PairLite {
  id: string;
  name: string;
  iconUrl?: string | null;
  iconUrl2?: string | null;
  category?: string;
}

export function useTradeCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function formatCountdown(expiresAt: number, now: number): string {
  const ms = Math.max(0, expiresAt - now);
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function useLivePnL(
  trades: TradeCardData[],
  currentPrice: number | null,
  currentPayout: number | null,
): Record<string, number> {
  const [live, setLive] = useState<Record<string, number>>({});
  useEffect(() => {
    if (currentPrice == null) return;
    const next: Record<string, number> = {};
    for (const t of trades) {
      if (t.status !== 'active' || t.openPrice == null) continue;
      const win = (t.type === 'up' && currentPrice > t.openPrice) || (t.type === 'down' && currentPrice < t.openPrice);
      const pct = t.payout ?? t.payoutPercent ?? currentPayout ?? 0;
      next[String(t.id)] = win ? t.amount * pct / 100 : -t.amount;
    }
    setLive(next);
  }, [trades, currentPrice, currentPayout]);
  return live;
}

export function TradeCard({
  t,
  now,
  livePnl,
  pair,
  fallbackPayout,
  expanded,
  onToggle,
}: {
  t: TradeCardData;
  now: number;
  livePnl: number | null;
  pair: PairLite | null | undefined;
  fallbackPayout: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isActive = t.status === 'active';
  const pnl = livePnl ?? (t.status === 'won' ? t.profit : t.status === 'lost' ? -t.amount : null);
  const countdown = t.expiresAt ? formatCountdown(t.expiresAt, now) : '--:--';
  const avatarSrc = pair?.iconUrl ?? (pair?.category === 'forex' && pair?.id && /^[A-Z]{6}$/.test(pair.id) ? `/api/resources/by-filename/${pair.id.slice(0, 3).toLowerCase()}.svg` : null);
  return (
    <div className={`border-b border-border/50 last:border-b-0 ${expanded ? 'bg-surface/50' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 text-left hover:bg-surface-hover/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === 'up' ? 'bg-green/10' : 'bg-red/10'}`}>
            <svg className={`w-3.5 h-3.5 ${t.type === 'up' ? 'text-green' : 'text-red'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              {t.type === 'up' ? (
                <path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {avatarSrc && <img src={avatarSrc} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />}
                <span className="text-foreground text-[11px] font-semibold truncate leading-tight">{t.symbol || pair?.name || 'Trade'}</span>
              </div>
              <span className={`text-[11px] font-mono font-bold tabular-nums flex-shrink-0 ${isActive ? 'text-blue' : 'text-text-dark'}`}>
                {isActive ? countdown : t.time || ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-[10px] text-text-dark font-mono tabular-nums">${t.amount.toFixed(2)}</span>
              {pnl !== null ? (
                <span className={`text-[11px] font-bold tabular-nums ${pnl > 0 ? 'text-green' : pnl < 0 ? 'text-red' : 'text-text-dark'}`}>
                  {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}$
                </span>
              ) : (
                <span className="text-[10px] text-text-dark">{t.payoutPercent ?? fallbackPayout}%</span>
              )}
            </div>
          </div>
          <svg className={`w-3.5 h-3.5 text-textDark flex-shrink-0 ml-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ease-in-out ${expanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="mx-3 mb-3 bg-background rounded-xl border border-border p-3.5">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/60">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue animate-pulse' : t.status === 'won' ? 'bg-green' : 'bg-red'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue' : t.status === 'won' ? 'text-green' : 'text-red'}`}>
              {isActive ? 'Active' : t.status === 'won' ? 'Win' : 'Loss'}
            </span>
            <span className="text-[9px] text-textDark ml-auto">{t.time}</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-textDark">Open Price</span>
              <span className="text-[11px] text-foreground font-mono font-semibold">{t.openPrice?.toFixed(5) ?? '—'}</span>
            </div>
            {!isActive && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-textDark">Close Price</span>
                <span className="text-[11px] text-foreground font-mono font-semibold">{t.closePrice?.toFixed(5) ?? '—'}</span>
              </div>
            )}
            {isActive && t.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-textDark">Expires in</span>
                <span className="text-[11px] text-blue font-mono font-semibold">{formatCountdown(t.expiresAt, now)}</span>
              </div>
            )}
            <div className="h-px bg-border/40" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-textDark">Investment</span>
              <span className="text-[11px] text-foreground font-semibold">${t.amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-textDark">Payout</span>
              <span className="text-[11px] text-green font-semibold">{t.payoutPercent ?? fallbackPayout}%</span>
            </div>
            {!isActive && (
              <>
                <div className="h-px bg-border/40" />
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-textDark font-semibold">Profit</span>
                  <span className={`text-sm font-bold ${t.profit > 0 ? 'text-green' : 'text-red'}`}>{t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}$</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
