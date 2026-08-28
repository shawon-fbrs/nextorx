'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const [active, setActive] = useState(activeTab || tabs[0]?.id);

  const handleChange = (tabId: string) => {
    setActive(tabId);
    onChange(tabId);
  };

  return (
    <div className={cn('border-b border-border', className)}>
      <div className="flex gap-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px',
              active === tab.id
                ? 'text-blue border-blue'
                : 'text-textDark border-transparent hover:text-white hover:border-border'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  active === tab.id ? 'bg-blue/20 text-blue' : 'bg-surface text-textDark'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TabPanelProps {
  tabId: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ tabId, activeTab, children, className }: TabPanelProps) {
  if (tabId !== activeTab) return null;
  return <div className={className}>{children}</div>;
}
