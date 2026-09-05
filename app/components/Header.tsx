'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export type AccountType = 'demo' | 'real' | 'funded' | 'tournament';

interface HeaderProps {
  balance: number;
  demoBalance?: number;
}

const accountData: Record<AccountType, { icon: ReactNode; color: string; label: string }> = {
  demo: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-blue',
    label: 'Demo',
  },
  real: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-green',
    label: 'Real',
  },
  funded: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-orange',
    label: 'Funded',
  },
  tournament: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-yellow',
    label: 'Tournament',
  },
};

export function Header({ balance, demoBalance = 0 }: HeaderProps) {
  const pathname = usePathname();
  const accountTypeMatch = pathname.match(/\/trade\/(\w+)/);
  const accountType = (accountTypeMatch ? accountTypeMatch[1] : 'real') as AccountType;
  const { user, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
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
  const [editingDemo, setEditingDemo] = useState(false);
  const [demoValue, setDemoValue] = useState('');
  const active = accountData[accountType];

  const handleDemoReset = async () => {
    try {
      const res = await fetch('/api/trade/demo-balance', { method: 'POST' });
      const data = await res.json();
      if (data.balance !== undefined) {
        window.location.reload();
      }
    } catch {}
  };

  const handleDemoSave = async () => {
    const val = parseFloat(demoValue);
    if (isNaN(val) || val < 100 || val > 100000) return;
    try {
      const res = await fetch('/api/trade/demo-balance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: val }),
      });
      if (res.ok) {
        setEditingDemo(false);
        window.location.reload();
      }
    } catch {}
  };

  return (
    <header className="h-16 min-w-full bg-background border-b border-border flex items-center z-[100] flex-shrink-0 px-4 gap-4">
      <div className="flex items-center gap-4">
        <Link href={`/trade/${accountType}`} className="flex items-center gap-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24">
            <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
            <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
            <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
            <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
          </svg>
          <span className="text-white font-bold text-xl tracking-wide">NEXTORX</span>
        </Link>
      </div>

      <div className="flex items-center gap-5 ml-auto">
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setExpanded(false); }}
            className="relative p-2.5 text-text hover:text-white transition-colors rounded-lg hover:bg-surface"
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
              <span className="text-sm text-white font-bold">Notifications</span>
              <button onClick={markAllRead} className="text-[11px] text-blue hover:text-blue-hover transition-colors font-semibold">Mark all read</button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-[11px] text-text-dark text-center py-6">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 hover:bg-surface-hover transition-colors border-l-2 ${n.readAt ? 'border-l-transparent opacity-60' : 'border-l-blue bg-blue/5'}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-bold text-white">{n.title}</span>
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

        <div className="relative">
          <button
            onClick={() => { setExpanded(!expanded); setNotifOpen(false); }}
            className="flex items-center gap-3 bg-surface border border-border rounded-xl pl-4 pr-3 h-10 cursor-pointer hover:bg-surface-hover transition-colors"
          >
            <span className={`${active.color} flex-shrink-0 flex items-center justify-center w-5 h-5`}>{active.icon}</span>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] text-text font-semibold uppercase tracking-wide leading-tight">{active.label}</span>
              <span className="text-white font-bold text-base leading-tight">{hidden ? '••••••' : `$${balance.toFixed(2)}`}</span>
            </div>
            <svg className={`w-4 h-4 text-text transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>

          <div className={`absolute top-full right-0 mt-2 w-[340px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top z-[200] ${expanded ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'}`}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-text font-bold uppercase tracking-wider">Accounts</span>
                <button
                  onClick={() => setHidden(!hidden)}
                  className="flex items-center gap-1 text-text hover:text-white transition-colors text-[10px] font-medium"
                >
                  {hidden ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {hidden ? 'Show' : 'Hide'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(accountData) as AccountType[]).map((type) => {
                  const acc = accountData[type];
                  const isActive = type === accountType;
                  const isDisabled = type === 'funded' || type === 'tournament';
                  const typeBalance = type === 'demo' ? demoBalance : balance;
                  return (
                    <Link
                      key={type}
                      href={isDisabled ? '#' : `/trade/${type}`}
                      onClick={(e) => {
                        if (isDisabled) { e.preventDefault(); return; }
                        setExpanded(false);
                      }}
                      className={`relative p-3 rounded-xl border transition-all text-left ${
                        isActive
                          ? 'border-green/40 bg-gradient-to-br from-green/10 to-green/5 shadow-md'
                          : isDisabled
                            ? 'border-border/30 opacity-50 cursor-not-allowed'
                            : 'border-border hover:border-text-dark/50 hover:bg-surface-hover'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                        </div>
                      )}
                      {isDisabled && (
                        <div className="absolute top-2 right-2">
                          <span className="text-[8px] font-bold text-text-dark bg-background/50 px-1.5 py-0.5 rounded">SOON</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`${acc.color}`}>{acc.icon}</span>
                        <span className={`text-[11px] font-bold ${isActive ? 'text-green' : 'text-text'}`}>{acc.label}</span>
                      </div>
                      <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-text'}`}>
                        {hidden ? '••••••' : isDisabled ? '—' : `$${typeBalance.toFixed(2)}`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-text font-bold uppercase tracking-wider">Details</span>
              </div>
              <div className="bg-background rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-text-dark">Email</span>
                  <span className="text-[11px] text-white font-semibold max-w-[160px] truncate">{user?.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-text-dark">ID</span>
                  <span className="text-[11px] text-white font-semibold font-mono">{user?.uid || '—'}</span>
                </div>
                {accountType === 'demo' && (
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-text-dark">Balance</span>
                    {editingDemo ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={demoValue}
                          onChange={(e) => setDemoValue(e.target.value)}
                          className="w-20 bg-surface border border-border rounded px-2 py-0.5 text-[11px] text-white focus:outline-none focus:border-blue"
                          min={100}
                          max={100000}
                          step={100}
                        />
                        <button onClick={handleDemoSave} className="text-[10px] text-green font-bold">Save</button>
                        <button onClick={() => setEditingDemo(false)} className="text-[10px] text-text-dark font-bold">X</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setDemoValue(String(Math.round(balance))); setEditingDemo(true); }}
                        className="text-[11px] text-blue hover:text-blue-hover font-semibold"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2">
                <Link
                  href="/account"
                  onClick={() => setExpanded(false)}
                  className="flex-1 bg-background border border-border hover:bg-surface-hover text-text text-[11px] font-bold py-2.5 rounded-lg transition-colors text-center"
                >
                  Account Settings
                </Link>
                <button
                  onClick={() => { setExpanded(false); signOut(); }}
                  className="flex-1 bg-red/10 hover:bg-red/20 border border-red/20 text-red text-[11px] font-bold py-2.5 rounded-lg transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>

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
          className="border border-border hover:bg-surface-hover text-text hover:text-white font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
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
