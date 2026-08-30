'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AccountType = 'demo' | 'real' | 'funded' | 'tournament';

interface HeaderProps {
  balance: number;
}

const accountData: Record<AccountType, { icon: ReactNode; color: string; label: string; balance: number }> = {
  demo: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-blue',
    label: 'Demo Account',
    balance: 10000.00,
  },
  real: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-green',
    label: 'Real Account',
    balance: 0.00,
  },
  funded: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-orange',
    label: 'Funded Account',
    balance: 0.00,
  },
  tournament: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'text-yellow',
    label: 'Tournament',
    balance: 0.00,
  },
};

const accountLevels = [
  {
    name: 'Standard',
    badge: 'Active',
    profit: '+2%',
    requirement: '',
    description: 'Level for beginners',
    features: ['Basic percentage of profitability for all instruments', '+2% profit boost'],
  },
  {
    name: 'Pro',
    badge: 'Inactive',
    profit: '+4%',
    requirement: 'Balance from $5,000.00',
    description: 'Level for casual traders',
    features: [
      'Level for casual traders',
      'Increased percentage of profitability for all instruments',
      'Promo codes from the market in mailings and promotions',
      '+4% profit boost',
    ],
  },
  {
    name: 'VIP',
    badge: 'Inactive',
    profit: '+4%',
    requirement: 'Balance from $10,000.00',
    description: 'Level for professional traders',
    features: [
      'Level for professional traders',
      'Increased percentage of profitability for all instruments',
      'Promo codes from the market in mailings and promotions',
      '+4% profit boost',
    ],
  },
];

export function Header({ balance }: HeaderProps) {
  const pathname = usePathname();
  const accountTypeMatch = pathname.match(/\/trade\/(\w+)/);
  const accountType = (accountTypeMatch ? accountTypeMatch[1] : 'real') as AccountType;
  const [expanded, setExpanded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<typeof accountLevels[0] | null>(null);
  const active = accountData[accountType];

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
            <span className="absolute top-1 right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red text-[9px] font-bold text-white items-center justify-center">3</span>
            </span>
          </button>

          <div className={`absolute top-full right-0 mt-2 w-96 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top z-[200] ${notifOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'}`}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-bold">Notifications</span>
                <span className="text-[10px] font-bold text-white bg-red px-2 py-0.5 rounded-full">3 new</span>
              </div>
              <button className="text-[11px] text-blue hover:text-blue-hover transition-colors font-semibold">Mark all read</button>
            </div>

            <div className="px-5 flex gap-4 border-b border-border">
              <button className="pb-2.5 text-xs font-bold text-white border-b-2 border-blue">All</button>
              <button className="pb-2.5 text-xs font-semibold text-text-dark hover:text-text transition-colors">Trades</button>
              <button className="pb-2.5 text-xs font-semibold text-text-dark hover:text-text transition-colors">System</button>
              <button className="pb-2.5 text-xs font-semibold text-text-dark hover:text-text transition-colors">Promotions</button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <div className="px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer border-l-2 border-l-blue bg-blue/5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Trade Won</span>
                      <span className="text-[10px] text-text-dark">2m ago</span>
                    </div>
                    <p className="text-[11px] text-text leading-relaxed">EUR/USD trade closed in profit. You earned <span className="text-green font-bold">+$8.50</span></p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer border-l-2 border-l-blue bg-blue/5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Trade Reminder</span>
                      <span className="text-[10px] text-text-dark">15m ago</span>
                    </div>
                    <p className="text-[11px] text-text leading-relaxed">Your GBP/USD trade expires in <span className="text-orange font-bold">5 minutes</span></p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer border-l-2 border-l-blue bg-blue/5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Promo Code</span>
                      <span className="text-[10px] text-text-dark">1h ago</span>
                    </div>
                    <p className="text-[11px] text-text leading-relaxed">New promo code <span className="text-orange font-bold">TRADE50</span> available. Get +50% on deposit!</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer border-l-2 border-l-transparent opacity-60">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text">Account Verified</span>
                      <span className="text-[10px] text-text-dark">3h ago</span>
                    </div>
                    <p className="text-[11px] text-text-dark leading-relaxed">Your account has been successfully verified.</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer border-l-2 border-l-transparent opacity-60">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text">Deposit Successful</span>
                      <span className="text-[10px] text-text-dark">1d ago</span>
                    </div>
                    <p className="text-[11px] text-text-dark leading-relaxed">Deposit of <span className="font-semibold text-text">$500.00</span> credited to your account.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border">
              <button className="w-full text-center text-xs font-semibold text-blue hover:text-blue-hover transition-colors py-1.5">
                View All Notifications
              </button>
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

          <div className={`absolute top-full right-0 mt-2 w-96 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top z-[200] ${expanded ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'}`}>
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-text font-bold uppercase tracking-wider">Account Levels</span>
                <span className="text-[10px] text-text-dark">Tap for details</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {accountLevels.map((level) => {
                  const isActive = level.badge === 'Active';
                  return (
                    <button
                      key={level.name}
                      onClick={() => setSelectedLevel(level)}
                      className={`relative p-3 rounded-xl border transition-all text-left overflow-hidden ${
                        isActive
                          ? 'border-green/40 bg-gradient-to-br from-green/10 to-green/5 shadow-lg shadow-green/5'
                          : 'border-border hover:border-text-dark/50 hover:bg-surface-hover'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                        </div>
                      )}
                      <span className={`text-[11px] font-bold ${isActive ? 'text-green' : 'text-text'}`}>{level.name}</span>
                      <div className="mt-1.5">
                        <span className={`text-lg font-black ${isActive ? 'text-green' : 'text-white'}`}>{level.profit}</span>
                      </div>
                      <span className={`text-[9px] mt-1.5 inline-block px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-green/20 text-green' : 'bg-border/50 text-text-dark'
                      }`}>{level.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-text font-bold uppercase tracking-wider">Account Details</span>
                <button
                  onClick={() => setHidden(!hidden)}
                  className="flex items-center gap-1.5 text-text hover:text-white transition-colors text-[11px] font-medium bg-background px-2.5 py-1.5 rounded-lg"
                >
                  {hidden ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Show
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Hide
                    </>
                  )}
                </button>
              </div>
              <div className="bg-background rounded-xl p-3.5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center">
                      <svg className="w-4 h-4 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-xs text-text">Balance</span>
                  </div>
                  <span className="text-sm text-white font-bold">{hidden ? '••••••' : `$${balance.toFixed(2)}`}</span>
                </div>
                <div className="w-full h-px bg-border" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center">
                      <svg className="w-4 h-4 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-xs text-text">Email</span>
                  </div>
                  <span className="text-sm text-white font-semibold">{hidden ? '••••••••@••••••.com' : 'user@example.com'}</span>
                </div>
                <div className="w-full h-px bg-border" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center">
                      <svg className="w-4 h-4 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-xs text-text">ID</span>
                  </div>
                  <span className="text-sm text-white font-semibold">{hidden ? '••••••••' : '#12345678'}</span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-text font-bold uppercase tracking-wider">Switch Account</span>
              </div>
              <div className="space-y-2">
                {(Object.keys(accountData) as AccountType[]).map((type) => {
                  const acc = accountData[type];
                  const isActive = type === accountType;
                  return (
                    <Link
                      key={type}
                      href={`/trade/${type}`}
                      onClick={() => setExpanded(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-background border border-border shadow-md'
                          : 'hover:bg-surface-hover border border-transparent'
                      }`}
                    >
                      <span className={`${acc.color} flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-background`}>
                        {acc.icon}
                      </span>
                      <div className="flex flex-col items-start flex-1">
                        <span className="text-sm font-bold text-white">{acc.label}</span>
                        <span className="text-xs text-text">{hidden ? '••••••' : `$${acc.balance.toFixed(2)}`}</span>
                      </div>
                      {isActive ? (
                        <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-border" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-border" />

        <Link
          href={`/trade/${accountType}`}
          className="bg-green hover:bg-green-hover text-white font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-green/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </svg>
          Deposit
        </Link>

        <button className="bg-surface border border-border hover:bg-surface-hover text-text-light font-medium text-sm px-6 py-2.5 rounded-xl transition-colors">
          Withdrawal
        </button>
      </div>

      {selectedLevel && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLevel(null)}>
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className={`px-6 pt-6 pb-4 ${
              selectedLevel.name === 'Standard' ? 'bg-gradient-to-br from-blue/10 to-transparent' :
              selectedLevel.name === 'Pro' ? 'bg-gradient-to-br from-green/10 to-transparent' :
              'bg-gradient-to-br from-orange/10 to-transparent'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedLevel.name === 'Standard' ? 'bg-blue/20 text-blue' :
                    selectedLevel.name === 'Pro' ? 'bg-green/20 text-green' :
                    'bg-orange/20 text-orange'
                  }`}>
                    {selectedLevel.name === 'Standard' && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {selectedLevel.name === 'Pro' && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {selectedLevel.name === 'VIP' && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">{selectedLevel.name}</h3>
                    <p className="text-xs text-text mt-0.5">{selectedLevel.description}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLevel(null)} className="text-text hover:text-white transition-colors p-2 hover:bg-surface-hover rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="bg-background rounded-xl p-5 text-center">
                <span className="text-xs text-text-dark font-semibold uppercase tracking-wider">Profit Boost</span>
                <div className="mt-2">
                  <span className={`text-4xl font-black ${
                    selectedLevel.name === 'Standard' ? 'text-blue' :
                    selectedLevel.name === 'Pro' ? 'text-green' :
                    'text-orange'
                  }`}>{selectedLevel.profit}</span>
                </div>
                <p className="text-[11px] text-text-dark mt-1">Increased profitability on all trades</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              {selectedLevel.requirement && (
                <div className="bg-background/50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-dark font-semibold uppercase">Requirement</span>
                    <p className="text-sm text-white font-semibold">{selectedLevel.requirement}</p>
                  </div>
                </div>
              )}

              <div className="mb-5">
                <span className="text-[10px] text-text-dark font-semibold uppercase tracking-wider">Features Included</span>
                <ul className="mt-3 space-y-3">
                  {selectedLevel.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedLevel.name === 'Standard' ? 'bg-blue/20' :
                        selectedLevel.name === 'Pro' ? 'bg-green/20' :
                        'bg-orange/20'
                      }`}>
                        <svg className={`w-3 h-3 ${
                          selectedLevel.name === 'Standard' ? 'text-blue' :
                          selectedLevel.name === 'Pro' ? 'text-green' :
                          'text-orange'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-sm text-text">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-colors ${
                selectedLevel.badge === 'Active'
                  ? 'bg-border/50 cursor-default'
                  : selectedLevel.name === 'Pro'
                    ? 'bg-green hover:bg-green-hover shadow-lg shadow-green/20'
                    : 'bg-orange hover:bg-orange-hover shadow-lg shadow-orange/20'
              }`}>
                {selectedLevel.badge === 'Active' ? '✓ Current Level' : `Upgrade to ${selectedLevel.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
