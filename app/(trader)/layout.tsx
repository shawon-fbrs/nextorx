'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { SessionTimer } from '../components/SessionTimer';
import { useAuth } from '@/lib/auth-context';

const ADMIN_ROLES = new Set(['super_admin', 'finance', 'support', 'risk']);

export default function TraderLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const accountType = (params.accountType as string) || 'real';
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [balance, setBalance] = useState(0);

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
        let bal = data.wallet?.balance ?? 0;
        if (accountType === 'demo' && bal === 0) {
          const res = await fetch('/api/trade/demo-balance', { method: 'POST' });
          const demo = await res.json();
          if (cancelled) return;
          bal = demo.balance ?? bal;
        }
        setBalance(bal / 100);
      } catch {}
    };
    load();
    const timer = setInterval(load, 10000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [accountType]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background text-text text-sm">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header balance={balance} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
      <div className="fixed bottom-3 right-3 z-50">
        <SessionTimer />
      </div>
    </div>
  );
}
