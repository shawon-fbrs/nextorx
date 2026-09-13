'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { LeaderboardDrawer } from './LeaderboardDrawer';
import { Podium, Trophy, BanknoteArrowDown, BanknoteArrowUp, ArrowLeftRight, ChartSpline, TicketPercent } from 'lucide-react';
import type { ReactNode } from 'react';
import { TradeCard, useTradeCountdown, useLivePnL, type TradeCardData } from './TradeCard';
function getAccountTypeFromPath(pathname: string): string {
  const match = pathname.match(/\/trade\/(\w+)/);
  return match ? match[1] : 'real';
}

const MORE_LINKS: Array<{ icon: ReactNode; label: string; href: string }> = [
  { icon: <BanknoteArrowDown className="w-5 h-5" />, label: 'Deposit', href: '/deposit' },
  { icon: <BanknoteArrowUp className="w-5 h-5" />, label: 'Withdraw', href: '/withdraw' },
  { icon: <ArrowLeftRight className="w-5 h-5" />, label: 'Transactions', href: '/transactions' },
  { icon: <ChartSpline className="w-5 h-5" />, label: 'Analysis', href: '/analysis' },
  { icon: <TicketPercent className="w-5 h-5" />, label: 'Bonus', href: '/bonus' },
  { icon: 'M12 4.354a4 4 0 110 7.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: 'Referrals', href: '/referrals' },
  { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'Notifications', href: '/notifications' },
  { icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Support', href: '/support' },
  { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Account', href: '/account' },
];

interface PositionTrade {
  id: string;
  symbol: string;
  pairId?: string;
  type: 'up' | 'down';
  amount: number;
  payout: number;
  payoutPercent?: number;
  profit: number;
  time: string;
  status: string;
  openPrice?: number;
  closePrice?: number;
  expiresAt: number;
}

function PositionsSheet({ onClose, currentPrice, payoutMap }: { onClose: () => void; currentPrice: number | null; payoutMap: Record<string, number> }) {
  const pathname = usePathname();
  const now = useTradeCountdown();
  const [trades, setTrades] = useState<PositionTrade[]>([]);
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [pairs, setPairs] = useState<Array<{ id: string; name: string; iconUrl?: string | null; iconUrl2?: string | null; category?: string }>>([]);
  useEffect(() => {
    fetch('/api/market/pairs').then((r) => r.json()).then((d) => setPairs(d.pairs ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const wallet = getAccountTypeFromPath(pathname) === 'demo' ? 'demo' : 'real';
    fetch(`/api/trade/trades?limit=20&wallet=${wallet}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const mapped: PositionTrade[] = ((d.trades ?? []) as Array<Record<string, unknown>>).map((t) => {
          const createdAt = new Date(t.createdAt as string).getTime();
          return {
            id: String(t.id),
            symbol: ((t.pair as Record<string, unknown> | undefined)?.name as string) ?? '',
            pairId: String((t as Record<string, unknown>).pairId ?? (t.pair as Record<string, unknown> | undefined)?.id ?? ''),
            type: (String(t.direction).toLowerCase() === 'up' ? 'up' : 'down') as 'up' | 'down',
            amount: Number(t.amount) / 100,
            payout: Number(t.payoutPercent ?? 0),
            payoutPercent: Number(t.payoutPercent ?? 0),
            profit: t.profit == null ? 0 : Number(t.profit) / 100,
            status: String(t.status).toLowerCase(),
            time: new Date(createdAt).toLocaleTimeString(),
            openPrice: (t as Record<string, unknown>).openPrice != null ? Number((t as Record<string, unknown>).openPrice) : undefined,
            closePrice: (t as Record<string, unknown>).closePrice != null ? Number((t as Record<string, unknown>).closePrice) : undefined,
            expiresAt: createdAt + Number(t.durationSeconds ?? 0) * 1000,
          };
        });
        setTrades(mapped);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const active = trades.filter((t) => t.status === 'active');
  const settled = trades.filter((t) => t.status !== 'active');
  const ordered = [...active, ...settled];
  const live = useLivePnL(trades as unknown as TradeCardData[], currentPrice, null);
  const pairsById = new Map(pairs.map((p) => [p.id, p]));

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden">
        <div className="relative px-4 pt-2.5 pb-2 flex items-center justify-center border-b border-border flex-shrink-0">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-dark/40" />
          <span className="text-sm font-bold text-foreground mt-1">All Trades</span>
          <button onClick={onClose} className="absolute right-3 top-2 p-1.5 text-text-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 space-y-2">
          {trades.length === 0 && <p className="text-xs text-text-dark text-center py-6">No positions yet.</p>}
          {ordered.length > 0 ? (
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              {ordered.map((t) => (
                <TradeCard
                  key={String(t.id)}
                  t={t as unknown as TradeCardData}
                  now={now}
                  livePnl={live[String(t.id)] ?? null}
                  pair={pairsById.get(String(t.pairId ?? '')) ?? null}
                  fallbackPayout={t.payoutPercent ?? payoutMap[String(t.pairId ?? '')] ?? 0}
                  expanded={expanded === t.id}
                  onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden">
        <div className="relative px-4 pt-2.5 pb-2 flex items-center justify-center border-b border-border flex-shrink-0">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-dark/40" />
          <span className="text-sm font-bold text-foreground mt-1">More</span>
          <button onClick={onClose} className="absolute right-3 top-2 p-1.5 text-text-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {MORE_LINKS.map((item) => (
              <Link key={item.label} href={item.href} onClick={onClose}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-background border border-border text-text active:scale-95 transition-transform">
                {typeof item.icon === 'string' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  item.icon
                )}
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
          <button onClick={toggleTheme}
            className="mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border text-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {theme === 'dark' ? (
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            <span className="text-xs font-semibold flex-1 text-left">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            onClick={() => { onClose(); signOut().then(() => router.push('/login')).catch(() => router.push('/login')); }}
            className="mt-2 mb-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red/10 border border-red/20 text-red text-xs font-bold">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function LandscapeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const accountType = getAccountTypeFromPath(pathname);
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const [boardOpen, setBoardOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [bottomPrice, setBottomPrice] = useState<number | null>(null);
  const [bottomPayouts, setBottomPayouts] = useState<Record<string, number>>({});
  useEffect(() => {
    const onTick = (e: Event) => {
      const d = (e as CustomEvent).detail as { price?: number };
      if (d?.price != null) setBottomPrice(d.price);
    };
    window.addEventListener('trade:price', onTick as EventListener);
    fetch('/api/market/payouts').then((r) => r.json()).then((d) => setBottomPayouts(d.payouts ?? {})).catch(() => {});
    return () => window.removeEventListener('trade:price', onTick as EventListener);
  }, []);

  const tradeHref = `/trade/${accountType}`;
  const row = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-[0.99]';

  return (
    <div className={`fixed inset-0 z-[85] hidden max-lg:landscape:block ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute left-0 top-0 bottom-0 w-64 max-w-[80vw] bg-surface border-r border-border flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative px-4 pt-3 pb-2.5 flex items-center border-b border-border flex-shrink-0">
          <span className="text-sm font-bold text-foreground">Menu</span>
          <button onClick={onClose} className="absolute right-3 top-2.5 p-1.5 text-text-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <Link href={tradeHref} onClick={onClose} className={`${row} ${pathname === tradeHref ? 'bg-blue/15 text-blue' : 'text-text hover:bg-surface-hover'}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Trade
          </Link>
          <button onClick={() => setPositionsOpen(true)} className={`${row} text-text hover:bg-surface-hover`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All Trades
          </button>
          <button onClick={() => setBoardOpen(true)} className={`${row} text-text hover:bg-surface-hover`}>
            <Podium className="w-5 h-5 flex-shrink-0" />
            Leaderboard
          </button>
          <Link href="/trade/tournament" onClick={onClose} className={`${row} ${pathname === '/trade/tournament' ? 'bg-blue/15 text-blue' : 'text-text hover:bg-surface-hover'}`}>
            <Trophy className="w-5 h-5 flex-shrink-0" />
            Tournaments
          </Link>
          <div className="text-[10px] font-bold text-text-dark uppercase tracking-wider px-3 pt-3 pb-1">More</div>
          <div className="grid grid-cols-2 gap-1.5">
            {MORE_LINKS.map((item) => (
              <Link key={item.label} href={item.href} onClick={onClose}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background border border-border text-text active:scale-95 transition-transform">
                {typeof item.icon === 'string' ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  item.icon
                )}
                <span className="text-[11px] font-semibold truncate">{item.label}</span>
              </Link>
            ))}
          </div>
          <button onClick={toggleTheme} className={`${row} text-text hover:bg-surface-hover mt-1`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {theme === 'dark' ? (
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={() => { onClose(); signOut().then(() => router.push('/login')).catch(() => router.push('/login')); }}
            className={`${row} text-red hover:bg-red/10 justify-center mt-1`}>
            Log Out
          </button>
        </div>
      </aside>
      {positionsOpen && <PositionsSheet onClose={() => setPositionsOpen(false)} currentPrice={bottomPrice} payoutMap={bottomPayouts} />}
      <LeaderboardDrawer open={boardOpen} onClose={() => setBoardOpen(false)} />
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const accountType = getAccountTypeFromPath(pathname);
  const [boardOpen, setBoardOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [bottomPrice, setBottomPrice] = useState<number | null>(null);
  const [bottomPayouts, setBottomPayouts] = useState<Record<string, number>>({});
  useEffect(() => {
    const onTick = (e: Event) => {
      const d = (e as CustomEvent).detail as { price?: number };
      if (d?.price != null) setBottomPrice(d.price);
    };
    window.addEventListener('trade:price', onTick as EventListener);
    fetch('/api/market/payouts').then((r) => r.json()).then((d) => setBottomPayouts(d.payouts ?? {})).catch(() => {});
    return () => window.removeEventListener('trade:price', onTick as EventListener);
  }, []);

  const tradeHref = `/trade/${accountType}`;
  const isTrade = pathname === tradeHref;
  const isTournament = pathname === '/trade/tournament';

  const btn = (active: boolean) =>
    `flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${active ? 'text-blue' : 'text-text-dark'}`;

  return (
    <>
      <nav className="lg:hidden landscape:hidden fixed bottom-0 inset-x-0 z-[80] bg-surface/95 backdrop-blur border-t border-border flex items-stretch px-1"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Link href={tradeHref} className={btn(isTrade)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-bold">Trade</span>
        </Link>
        <button onClick={() => setPositionsOpen(true)} className={btn(positionsOpen)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-bold">All Trades</span>
        </button>
        <button onClick={() => setBoardOpen(true)} className={btn(boardOpen)}>
          <Podium className="w-5 h-5" />
          <span className="text-[10px] font-bold">Leaderboard</span>
        </button>
        <Link href="/trade/tournament" className={btn(isTournament)}>
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-bold">Tournaments</span>
        </Link>
        <button onClick={() => setMoreOpen(true)} className={btn(moreOpen)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>
      {positionsOpen && <PositionsSheet onClose={() => setPositionsOpen(false)} currentPrice={bottomPrice} payoutMap={bottomPayouts} />}
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
      <LeaderboardDrawer open={boardOpen} onClose={() => setBoardOpen(false)} />
    </>
  );
}
