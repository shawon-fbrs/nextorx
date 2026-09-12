'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import type { AccountType } from './Header';

interface AccountMenuProps {
  balance: number;
  demoBalance?: number;
  realBalance?: number;
  accountType: AccountType;
  compact?: boolean;
}

export function AccountMenu({ balance, demoBalance = 0, realBalance, accountType, compact = false }: AccountMenuProps) {
  const { user, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [editingDemo, setEditingDemo] = useState(false);
  const [demoValue, setDemoValue] = useState('');
  const menuId = useRef(`menu-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const id = menuId.current;
    const close = (e: Event) => {
      if ((e as CustomEvent).detail !== id) setExpanded(false);
    };
    window.addEventListener('menu:open', close);
    return () => window.removeEventListener('menu:open', close);
  }, []);

  const toggle = () => {
    window.dispatchEvent(new CustomEvent('menu:open', { detail: menuId.current }));
    setExpanded((v) => !v);
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

  const accounts: Array<{ type: AccountType; label: string; color: string; icon: ReactNode; disabled?: boolean }> = [
    {
      type: 'demo', label: 'Demo', color: 'text-blue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      type: 'real', label: 'Real', color: 'text-green',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      type: 'funded', label: 'Funded', color: 'text-orange', disabled: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      type: 'tournament', label: 'Tournament', color: 'text-yellow', disabled: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];
  const real = realBalance ?? balance;
  const active = accounts.find((a) => a.type === accountType);

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className={`flex items-center gap-2.5 bg-surface border border-border rounded-xl cursor-pointer hover:bg-surface-hover transition-colors ${compact ? 'pl-2.5 pr-2 h-10' : 'pl-4 pr-3 h-10'}`}
      >
        <span className={`${active?.color ?? 'text-text'} flex-shrink-0 flex items-center justify-center`}>{active?.icon}</span>
        <div className="flex flex-col justify-center items-start">
          <span className="text-[10px] text-text font-semibold uppercase tracking-wide leading-tight">{active?.label ?? accountType}</span>
          <span className={`text-foreground font-bold leading-tight tabular-nums ${compact ? 'text-sm' : 'text-base'}`}>{hidden ? '••••••' : `$${balance.toFixed(2)}`}</span>
        </div>
        <svg className={`w-4 h-4 text-text transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </button>

      <div className={`absolute top-full right-0 mt-2 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top z-[200] ${compact ? 'w-[300px] max-w-[calc(100vw-2rem)]' : 'w-[340px]'} ${expanded ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-text font-bold uppercase tracking-wider">Accounts</span>
            <button
              onClick={() => setHidden(!hidden)}
              className="flex items-center gap-1 text-text hover:text-foreground transition-colors text-[10px] font-medium"
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
            {accounts.map((acc) => {
              const isActive = acc.type === accountType;
              const typeBalance = acc.type === 'demo' ? demoBalance : real;
              return (
                <Link
                  key={acc.type}
                  href={acc.disabled ? '#' : `/trade/${acc.type}`}
                  onClick={(e) => {
                    if (acc.disabled) { e.preventDefault(); return; }
                    setExpanded(false);
                  }}
                  className={`relative p-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? 'border-green/40 bg-gradient-to-br from-green/10 to-green/5 shadow-md'
                      : acc.disabled
                        ? 'border-border/30 opacity-50 cursor-not-allowed'
                        : 'border-border hover:border-text-dark/50 hover:bg-surface-hover'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                    </div>
                  )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`${acc.color}`}>{acc.icon}</span>
                        <span className={`text-[11px] font-bold ${isActive ? 'text-green' : 'text-text'}`}>{acc.label}</span>
                      </div>
                  <span className={`text-sm font-black ${isActive ? 'text-foreground' : 'text-text'}`}>
                    {hidden ? '••••••' : acc.disabled ? '—' : `$${typeBalance.toFixed(2)}`}
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
              <span className="text-[11px] text-foreground font-semibold max-w-[160px] truncate">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-text-dark">ID</span>
              <span className="text-[11px] text-foreground font-semibold font-mono">{user?.uid || '—'}</span>
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
                      className="w-20 bg-surface border border-border rounded px-2 py-0.5 text-[11px] text-foreground focus:outline-none focus:border-blue"
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
  );
}
