'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth-client';

export function MarketingHeader() {
  const { data: session } = useSession();
  const user = session?.user ?? null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24">
              <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
              <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
              <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
              <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
            </svg>
            <span className="text-white font-bold text-lg tracking-wide">NEXTORX</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="/#features" className="text-sm text-text hover:text-white transition-colors">Features</a>
            <a href="/#assets" className="text-sm text-text hover:text-white transition-colors">Assets</a>
            <a href="/#how-it-works" className="text-sm text-text hover:text-white transition-colors">How It Works</a>
            <Link href="/verify" className="text-sm text-text hover:text-white transition-colors">Fairness</Link>
            <Link href="/seeds" className="text-sm text-text hover:text-white transition-colors">Seeds</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/verify" className="text-sm font-semibold text-text hover:text-white transition-colors px-4 py-2">
                Verify
              </Link>
              <Link href="/trade/demo" className="bg-green hover:bg-green-hover text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-green/20">
                Trade
              </Link>
              <Link href="/account" title={user.name || user.email || 'Account'}>
                {user.image ? (
                  <img src={user.image} alt="" className="w-9 h-9 rounded-full object-cover border border-border" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-blue/20 border border-blue/30 flex items-center justify-center text-sm font-bold text-white">
                    {(user.name || user.email || 'T').charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-text hover:text-white transition-colors px-4 py-2">
                Log In
              </Link>
              <Link href="/register" className="bg-green hover:bg-green-hover text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-green/20">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
