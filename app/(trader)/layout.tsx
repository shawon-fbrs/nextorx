'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export default function TraderLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const accountType = (params.accountType as string) || 'real';
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetch('/api/trade/balance')
      .then(r => r.json())
      .then(async (data) => {
        let bal = data.wallet?.balance ?? 0;
        // Auto-credit demo balance for new users
        if (accountType === 'demo' && bal === 0) {
          const res = await fetch('/api/trade/demo-balance', { method: 'POST' });
          const demo = await res.json();
          bal = demo.balance ?? bal;
        }
        setBalance(bal / 100);
      })
      .catch(() => {});
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
    </div>
  );
}
