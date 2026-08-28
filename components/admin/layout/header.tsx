'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/admin/ui/search-input';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function AdminHeader({ onToggleSidebar, isSidebarOpen }: AdminHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border z-40 flex items-center justify-between px-4">
      {/* Left side - hamburger + search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 flex items-center justify-center text-textDark hover:text-white rounded-lg hover:bg-surface-hover transition-colors lg:hidden"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 items-center justify-center text-textDark hover:text-white rounded-lg hover:bg-surface-hover transition-colors hidden lg:flex"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d={isSidebarOpen ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h16M4 18h16"} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="hidden md:block w-64">
          <SearchInput placeholder="Search users, trades..." />
        </div>

        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="w-10 h-10 flex items-center justify-center text-textDark hover:text-white rounded-lg hover:bg-surface-hover transition-colors md:hidden"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Mobile search overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 top-16 bg-surface z-50 p-4 md:hidden">
          <SearchInput
            placeholder="Search users, trades..."
            autoFocus
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="mt-4 w-full py-2 text-sm text-textDark hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative w-10 h-10 flex items-center justify-center text-textDark hover:text-white rounded-lg hover:bg-surface-hover transition-colors">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red rounded-full" />
        </button>

        {/* Platform status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green/10 rounded-lg">
          <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
          <span className="text-[11px] font-semibold text-green">Online</span>
        </div>
      </div>
    </header>
  );
}
