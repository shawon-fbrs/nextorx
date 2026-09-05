'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

function getAccountTypeFromPath(pathname: string): string {
  const match = pathname.match(/\/trade\/(\w+)/);
  return match ? match[1] : 'real';
}

const getNavItems = (accountType: string): Array<{ icon: string; label: string; href: string }> => [
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Trade', href: `/trade/${accountType}` },
  { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', label: 'Leaderboard', href: '/leaderboard' },
  { icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Support', href: '/support' },
  { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Account', href: '/account' },
];

const getMoreItems = (): Array<{ icon: string; label: string; href: string }> => [
  { icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', label: 'Deposit', href: '/deposit' },
  { icon: 'M20 12H4', label: 'Withdraw', href: '/withdraw' },
  { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Transactions', href: '/transactions' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analysis', href: '/analysis' },
  { icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', label: 'Bonus', href: '/bonus' },
  { icon: 'M12 4.354a4 4 0 110 7.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: 'Referrals', href: '/referrals' },
  { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'Notifications', href: '/notifications' },
];

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const accountType = getAccountTypeFromPath(pathname);
  const navItems = getNavItems(accountType);
  const moreItems = getMoreItems();

  return (
    <aside
      className={`bg-background border-r border-border flex flex-col justify-between flex-shrink-0 z-30 transition-all duration-300 ${
        expanded ? 'w-52' : 'w-[72px]'
      }`}
    >
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full h-16 flex-shrink-0 flex items-center justify-center hover:bg-surface transition-colors border-b border-border"
        >
          {expanded ? (
            <svg className="w-6 h-6 text-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          )}
        </button>

        <div className={`flex flex-col pt-4 gap-2 overflow-y-auto flex-1 min-h-0 pb-4 ${expanded ? 'px-3' : 'items-center px-2'}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/support' && pathname === '/support');
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl transition-colors relative ${
                  expanded ? 'px-4 py-3.5' : 'flex-col py-3 px-0 w-14'
                } ${
                  isActive
                    ? 'bg-blue/15 text-blue'
                    : 'text-text hover:bg-surface hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue rounded-r-md" />
                )}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                {expanded ? (
                  <span className="text-sm font-medium">{item.label}</span>
                ) : (
                  <span className="text-[10px] font-medium uppercase leading-tight text-center">{item.label}</span>
                )}
              </Link>
            );
          })}
          {expanded && (
            <span className="text-[10px] font-bold text-text-dark uppercase tracking-wider px-4 pt-3">Wallet</span>
          )}
          {moreItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl transition-colors relative ${
                  expanded ? 'px-4 py-3.5' : 'flex-col py-3 px-0 w-14'
                } ${
                  isActive
                    ? 'bg-blue/15 text-blue'
                    : 'text-text hover:bg-surface hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue rounded-r-md" />
                )}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                {expanded ? (
                  <span className="text-sm font-medium">{item.label}</span>
                ) : (
                  <span className="text-[10px] font-medium uppercase leading-tight text-center">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center pb-6 gap-2">
        <button
          onClick={() => signOut().then(() => router.push('/login')).catch(() => router.push('/login'))}
          className="w-12 h-12 rounded-xl bg-surface border border-border text-red hover:bg-surface-hover flex flex-col items-center justify-center"
          title="Sign out"
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          <span className="text-[9px] font-bold">Exit</span>
        </button>
      </div>
    </aside>
  );
}
