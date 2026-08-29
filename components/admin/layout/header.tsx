'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/admin/ui/command-palette';
import { useAdminRole, AdminRole } from '@/components/admin/context/AdminRoleContext';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function AdminHeader({ onToggleSidebar, isSidebarOpen }: AdminHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const { role, setRole } = useAdminRole();

  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roleLabels: Record<AdminRole, { label: string; color: string }> = {
    superadmin: { label: 'Superadmin', color: 'text-purple' },
    admin: { label: 'Admin', color: 'text-blue' },
    viewer: { label: 'Viewer', color: 'text-green' },
  };

  return (
    <>
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

          {/* Command Palette Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 h-10 bg-background border border-border rounded-lg hover:border-textDark/50 transition-colors group"
          >
            <svg className="w-4 h-4 text-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-textDark">Search...</span>
            <kbd className="ml-4 px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-border rounded text-textDark">
              {isMac ? '⌘' : 'Ctrl'}K
            </kbd>
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-textDark hover:text-white rounded-lg hover:bg-surface-hover transition-colors md:hidden"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Role Selector */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg hover:border-textDark/50 transition-colors"
            >
              <span className={cn('text-[11px] font-semibold', roleLabels[role].color)}>
                {roleLabels[role].label}
              </span>
              <svg className="w-3 h-3 text-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {roleMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-40 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-[10px] text-textDark uppercase font-semibold">Switch Role (Demo)</p>
                  </div>
                  {(['superadmin', 'admin', 'viewer'] as AdminRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRole(r); setRoleMenuOpen(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors flex items-center gap-2',
                        role === r && 'bg-background'
                      )}
                    >
                      <span className={cn('font-semibold', roleLabels[r].color)}>{roleLabels[r].label}</span>
                      {role === r && (
                        <svg className="w-4 h-4 text-blue ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

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

      <CommandPalette open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
