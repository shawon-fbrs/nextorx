'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

function getAccountTypeFromPath(pathname: string): string {
  const match = pathname.match(/\/trade\/(\w+)/);
  return match ? match[1] : 'real';
}

const getNavItems = (accountType: string): Array<{ icon: string; label: string; href: string; badge?: string }> => [
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Trade', href: `/trade/${accountType}` },
  { icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Support', href: '/support' },
  { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Account', href: '/account' },
  { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', label: 'Tournaments', href: '/tournaments' },
  { icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z', label: 'More', href: '/more' },
];

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const accountType = getAccountTypeFromPath(pathname);
  const navItems = getNavItems(accountType);

  return (
    <aside
      className={`bg-background border-r border-border flex flex-col justify-between flex-shrink-0 z-30 transition-all duration-300 ${
        expanded ? 'w-52' : 'w-[72px]'
      }`}
    >
      <div className="flex flex-col">
        <button
          onClick={onToggle}
          className="w-full h-16 flex items-center justify-center hover:bg-surface transition-colors border-b border-border"
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

        <div className={`flex flex-col pt-4 gap-2 ${expanded ? 'px-3' : 'items-center px-2'}`}>
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
                {item.badge && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                    {item.badge}
                  </div>
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
        <Link
          href="/support"
          className="w-12 h-12 rounded-xl bg-surface border border-border text-green hover:bg-surface-hover flex flex-col items-center justify-center"
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          <span className="text-[9px] font-bold">Help</span>
        </Link>
      </div>
    </aside>
  );
}
