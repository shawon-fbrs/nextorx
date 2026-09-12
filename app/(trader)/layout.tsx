'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { BottomNav } from '../components/BottomNav';
import { BalanceProvider } from './balance-context';
import { useAuth } from '@/lib/auth-context';
import { Toaster } from 'sonner';

const ADMIN_ROLES = new Set(['super_admin', 'finance', 'support', 'risk']);

export default function TraderLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const accountType = (params.accountType as string) || 'real';
  const isTradeRoute = pathname.startsWith('/trade/');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [balance, setBalance] = useState(0);
  const [demoBalance, setDemoBalance] = useState(0);
  const shownBalance = accountType === 'demo' ? demoBalance : balance;

  useEffect(() => {
    if (!loading && user && user.role && ADMIN_ROLES.has(user.role)) {
      router.replace('/console-panel');
    }
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetch('/api/trade/balance').then((r) => r.json());
        if (cancelled) return;
        const real = data.available ?? data.wallet?.balance ?? 0;
        let demo = data.demoAvailable ?? data.wallet?.demoBalance ?? 0;
        if (demo === 0) {
          const res = await fetch('/api/trade/demo-balance', { method: 'POST' });
          const demoRes = await res.json();
          if (cancelled) return;
          demo = demoRes.balance ?? demo;
        }
        setBalance(real / 100);
        setDemoBalance(demo / 100);
      } catch {}
    };
    load();
    const timer = setInterval(load, 10000);
    const onFocus = () => load();
    const onRefresh = () => load();
    window.addEventListener('focus', onFocus);
    window.addEventListener('balance-refresh', onRefresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('balance-refresh', onRefresh);
    };
  }, [accountType]);

  const redirecting = !loading && !!user?.role && ADMIN_ROLES.has(user.role);
  if (loading || redirecting) {
    return (
      <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-blue animate-spin" />
      </div>
    );
  }

  return (
    <BalanceProvider value={{ balance: shownBalance, demoBalance, realBalance: balance, accountType }}>
    <div className="w-screen overflow-hidden flex bg-background text-text text-sm h-[100vh] supports-[height:100dvh]:h-[100dvh]">
      <div className="contents max-lg:hidden">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className={isTradeRoute ? 'contents max-lg:hidden' : 'contents'}>
        <Header balance={shownBalance} demoBalance={demoBalance} realBalance={balance} />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
        <div className="lg:hidden landscape:hidden flex-shrink-0" style={{ height: 'calc(54px + env(safe-area-inset-bottom))' }} />
      </div>
      <BottomNav />
      <Toaster position="bottom-left" theme="dark" richColors closeButton />
    </div>
    </BalanceProvider>
  );
}
