'use client';

import { useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export default function TraderLayout({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background text-text text-sm">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header balance={1000} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
