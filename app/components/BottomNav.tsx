'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { LeaderboardDrawer } from './LeaderboardDrawer';

function getAccountTypeFromPath(pathname: string): string {
  const match = pathname.match(/\/trade\/(\w+)/);
  return match ? match[1] : 'real';
}

const MORE_LINKS: Array<{ icon: string; label: string; href: string }> = [
  { icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', label: 'Deposit', href: '/deposit' },
  { icon: 'M20 12H4', label: 'Withdraw', href: '/withdraw' },
  { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Transactions', href: '/transactions' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analysis', href: '/analysis' },
  { icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', label: 'Bonus', href: '/bonus' },
  { icon: 'M12 4.354a4 4 0 110 7.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: 'Referrals', href: '/referrals' },
  { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'Notifications', href: '/notifications' },
  { icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Support', href: '/support' },
  { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Account', href: '/account' },
];

interface PositionTrade {
  id: string;
  symbol: string;
  type: 'up' | 'down';
  amount: number;
  payout: number;
  profit: number;
  status: string;
  expiresAt: number;
}

function PositionsSheet({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [trades, setTrades] = useState<PositionTrade[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
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
            type: (String(t.direction).toLowerCase() === 'up' ? 'up' : 'down') as 'up' | 'down',
            amount: Number(t.amount) / 100,
            payout: Number(t.payoutPercent ?? 0),
            profit: t.profit == null ? 0 : Number(t.profit) / 100,
            status: String(t.status).toLowerCase(),
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

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden">
        <div className="relative px-4 pt-2.5 pb-2 flex items-center justify-center border-b border-border flex-shrink-0">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-dark/40" />
          <span className="text-sm font-bold text-foreground mt-1">Positions</span>
          <button onClick={onClose} className="absolute right-3 top-2 p-1.5 text-text-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 space-y-2">
          {trades.length === 0 && <p className="text-xs text-text-dark text-center py-6">No positions yet.</p>}
          {active.map((t) => {
            const left = Math.max(0, t.expiresAt - now);
            const mm = String(Math.floor(left / 60000)).padStart(2, '0');
            const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
            return (
              <div key={t.id} className="flex items-center gap-3 bg-background border border-border rounded-xl px-3 py-2.5">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === 'up' ? 'bg-green/15 text-green' : 'bg-red/15 text-red'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    {t.type === 'up'
                      ? <path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" />
                      : <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />}
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">{t.symbol || 'Trade'}</div>
                  <div className="text-[10px] text-text-dark font-mono tabular-nums">${t.amount.toFixed(2)} · {t.payout}%</div>
                </div>
                <span className="text-xs font-bold text-blue font-mono tabular-nums">{mm}:{ss}</span>
              </div>
            );
          })}
          {settled.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-background border border-border/50 rounded-xl px-3 py-2 opacity-70">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${t.status === 'won' ? 'bg-green/15 text-green' : 'bg-red/15 text-red'}`}>
                {t.status === 'won' ? `+$${t.profit.toFixed(2)}` : 'LOST'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate">{t.symbol || 'Trade'}</div>
                <div className="text-[10px] text-text-dark font-mono tabular-nums">${t.amount.toFixed(2)}</div>
              </div>
            </div>
          ))}
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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

export function BottomNav() {
  const pathname = usePathname();
  const accountType = getAccountTypeFromPath(pathname);
  const [boardOpen, setBoardOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);

  const tradeHref = `/trade/${accountType}`;
  const isTrade = pathname === tradeHref;
  const isTournament = pathname === '/trade/tournament';

  const btn = (active: boolean) =>
    `flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${active ? 'text-blue' : 'text-text-dark'}`;

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[80] bg-surface/95 backdrop-blur border-t border-border flex items-stretch px-1"
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
          <span className="text-[10px] font-bold">Positions</span>
        </button>
        <button onClick={() => setBoardOpen(true)} className={btn(boardOpen)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-bold">Leaderboard</span>
        </button>
        <Link href="/trade/tournament" className={btn(isTournament)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-bold">Tournaments</span>
        </Link>
        <button onClick={() => setMoreOpen(true)} className={btn(moreOpen)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>
      {positionsOpen && <PositionsSheet onClose={() => setPositionsOpen(false)} />}
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
      <LeaderboardDrawer open={boardOpen} onClose={() => setBoardOpen(false)} />
    </>
  );
}
