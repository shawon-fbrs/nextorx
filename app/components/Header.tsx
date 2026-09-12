'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { AccountMenu } from './AccountMenu';

export type AccountType = 'demo' | 'real' | 'funded' | 'tournament';

interface HeaderProps {
  balance: number;
  demoBalance?: number;
  realBalance?: number;
}


export function Header({ balance, demoBalance = 0, realBalance }: HeaderProps) {
  const pathname = usePathname();
  const accountTypeMatch = pathname.match(/\/trade\/(\w+)/);
  const accountType = (accountTypeMatch ? accountTypeMatch[1] : 'real') as AccountType;
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string }>>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch('/api/notifications?limit=10')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setNotifications(d.notifications ?? []);
          setUnread(d.unread ?? 0);
        }
      })
      .catch(() => {});
  }, [user]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {}
  };
  return (
    <header className="h-16 min-w-full bg-background border-b border-border flex items-center z-[100] flex-shrink-0 px-4 gap-4">
      <div className="flex items-center gap-4">
        <Link href={`/trade/${accountType}`} className="flex items-center gap-4">
          <svg className="w-7 h-7 text-foreground" fill="none" viewBox="0 0 24 24">
            <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
            <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
            <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
            <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
          </svg>
          <span className="text-foreground font-bold text-xl tracking-wide">NEXTORX</span>
        </Link>
      </div>

      <div className="flex items-center gap-5 ml-auto">
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2.5 text-text hover:text-foreground transition-colors rounded-lg hover:bg-surface"
        >
          {theme === 'dark' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => { window.dispatchEvent(new Event('menu:open')); setNotifOpen(!notifOpen); }}
            className="relative p-2.5 text-text hover:text-foreground transition-colors rounded-lg hover:bg-surface"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red text-[9px] font-bold text-white items-center justify-center">{unread > 9 ? '9+' : unread}</span>
              </span>
            )}
          </button>

          <div className={`absolute top-full right-0 mt-2 w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top z-[200] ${notifOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'}`}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-sm text-foreground font-bold">Notifications</span>
              <button onClick={markAllRead} className="text-[11px] text-blue hover:text-blue-hover transition-colors font-semibold">Mark all read</button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-[11px] text-text-dark text-center py-6">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 hover:bg-surface-hover transition-colors border-l-2 ${n.readAt ? 'border-l-transparent opacity-60' : 'border-l-blue bg-blue/5'}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-bold text-foreground">{n.title}</span>
                      <span className="text-[10px] text-text-dark">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-text leading-relaxed">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-border" />

        <AccountMenu balance={balance} demoBalance={demoBalance} realBalance={realBalance} accountType={accountType} />

        <div className="w-px h-8 bg-border" />

        <Link
          href="/deposit"
          className="bg-green hover:bg-green-hover text-white font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-green/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </svg>
          Deposit
        </Link>
        <Link
          href="/withdraw"
          className="border border-border hover:bg-surface-hover text-text hover:text-foreground font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </svg>
          Withdraw
        </Link>
      </div>
    </header>
  );
}