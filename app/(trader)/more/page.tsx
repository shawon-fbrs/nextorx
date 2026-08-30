'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const sections = [
  {
    title: 'Finance',
    items: [
      { label: 'Deposit', desc: 'Add funds to your account', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', color: 'green', href: '/more/deposit' },
      { label: 'Withdrawal', desc: 'Withdraw your earnings', icon: 'M20 12H4', color: 'blue', href: '/more/withdraw' },
      { label: 'History', desc: 'View trade history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'orange', href: '/more/history' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', desc: 'Track your performance', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'blue', href: '#' },
      { label: 'Reports', desc: 'Detailed trade reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'orange', href: '#' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Notifications', desc: 'Manage your alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: 'red', href: '#' },
      { label: 'Language', desc: 'English (US)', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'blue', href: '#' },
      { label: 'Appearance', desc: 'Theme & display', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', color: 'orange', href: '#' },
    ],
  },
  {
    title: 'More',
    items: [
      { label: 'Promo Codes', desc: 'Redeem promotions', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'orange', href: '#' },
      { label: 'Help Center', desc: 'Get support', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green', href: '#' },
      { label: 'About', desc: 'Platform info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text', href: '#' },
    ],
  },
];

export default function MorePage() {
  const { user } = useAuth();

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">More</h1>
          <p className="text-sm text-text-dark mt-1">Additional features and settings</p>
        </div>

        {user && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-dark">Balance</p>
                <p className="text-lg font-bold text-white">${((user.balance || 0) / 100).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-dark">Bonus</p>
                <p className="text-sm font-bold text-green">${((user.bonusBalance || 0) / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-[11px] font-bold text-text-dark uppercase tracking-wider mb-3">{section.title}</h2>
              <div className="grid grid-cols-3 gap-3">
                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="bg-surface border border-border rounded-xl p-4 hover:bg-surface-hover transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        item.color === 'green' ? 'bg-green/15' :
                        item.color === 'blue' ? 'bg-blue/15' :
                        item.color === 'orange' ? 'bg-orange/15' :
                        item.color === 'red' ? 'bg-red/15' :
                        'bg-border/30'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          item.color === 'green' ? 'text-green' :
                          item.color === 'blue' ? 'text-blue' :
                          item.color === 'orange' ? 'text-orange' :
                          item.color === 'red' ? 'text-red' :
                          'text-text-dark'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.label}</h3>
                        <p className="text-[11px] text-text-dark">{item.desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
