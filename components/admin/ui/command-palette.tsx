'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { mockUsers } from '@/lib/mock-data/users';
import { mockTrades } from '@/lib/mock-data/trades';
import { mockAssets } from '@/lib/mock-data/assets';
import { mockTransactions } from '@/lib/mock-data/transactions';

interface SearchResult {
  type: 'user' | 'trade' | 'asset' | 'transaction';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const lower = q.toLowerCase();
    const items: SearchResult[] = [];

    mockUsers.slice(0, 5).forEach(u => {
      if (u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower)) {
        items.push({ type: 'user', id: u.id, title: u.name, subtitle: u.email, href: `/console-panel/users/${u.id}` });
      }
    });

    mockTrades.slice(0, 5).forEach(t => {
      if (t.userName.toLowerCase().includes(lower) || t.symbol.toLowerCase().includes(lower) || t.id.toLowerCase().includes(lower)) {
        items.push({ type: 'trade', id: t.id, title: `${t.symbol} - ${t.type.toUpperCase()}`, subtitle: `${t.userName} • $${t.amount}`, href: `/console-panel/trades` });
      }
    });

    mockAssets.slice(0, 5).forEach(a => {
      if (a.name.toLowerCase().includes(lower) || a.symbol.toLowerCase().includes(lower)) {
        items.push({ type: 'asset', id: a.id, title: a.name, subtitle: `${a.category} • ${a.currentPayout}% payout`, href: `/console-panel/otc` });
      }
    });

    mockTransactions.slice(0, 5).forEach(t => {
      if (t.userName.toLowerCase().includes(lower) || t.reference.toLowerCase().includes(lower)) {
        items.push({ type: 'transaction', id: t.reference, title: `${t.type === 'deposit' ? '↓' : '↑'} ${t.type} - $${t.amount}`, subtitle: t.userName, href: `/console-panel/finance` });
      }
    });

    setResults(items);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    search(query);
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'trade':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'asset':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'transaction':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-blue';
      case 'trade': return 'text-orange';
      case 'asset': return 'text-green';
      case 'transaction': return 'text-purple';
      default: return 'text-text';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
        <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <svg className="w-5 h-5 text-textDark flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search users, trades, assets, transactions..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-textDark"
            />
            <kbd className="px-2 py-1 text-[10px] font-mono bg-background border border-border rounded text-textDark">ESC</kbd>
          </div>

          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => { router.push(result.href); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    index === selectedIndex ? 'bg-background' : 'hover:bg-surface-hover'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0', getTypeColor(result.type))}>
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{result.title}</p>
                    <p className="text-[11px] text-textDark truncate">{result.subtitle}</p>
                  </div>
                  <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded', getTypeColor(result.type), 'bg-background')}>
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-textDark">No results found for "{query}"</p>
            </div>
          )}

          {!query && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-textDark">Start typing to search across users, trades, assets, and transactions</p>
            </div>
          )}

          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-textDark">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">↵</kbd>
              to select
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
