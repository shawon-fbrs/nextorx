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
    title: 'Rewards',
    items: [
      { label: 'Bonus', desc: 'Bonus wallet & wagering', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'orange', href: '/more/bonus' },
      { label: 'Referrals', desc: 'Invite & earn', icon: 'M12 4.354a4 4 0 110 7.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'green', href: '/more/referrals' },
      { label: 'Transactions', desc: 'Money movements', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'blue', href: '/more/transactions' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Verify ID', desc: 'Identity verification', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'green', href: '/more/kyc' },
      { label: 'Limits', desc: 'Responsible trading', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'orange', href: '/more/limits' },
    ],
  },
  {
    title: 'More',
    items: [
      { label: 'Leaderboard', desc: 'Top traders today', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: 'orange', href: '/leaderboard' },
      { label: 'Help Center', desc: 'Get support', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green', href: '/support' },
      { label: 'Verify Fairness', desc: 'Check market proofs', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'blue', href: '/verify' },
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
