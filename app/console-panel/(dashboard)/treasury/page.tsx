'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Badge } from '@/components/admin/ui/badge';
import { Skeleton } from '@/components/admin/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type TreasuryData = {
  snapshot: {
    totalBalance: number;
    userLiabilities: number;
    pendingWithdrawals: number;
    pendingWithdrawalAmount: number;
    todayDeposits: number;
    todayWithdrawals: number;
  };
  history: { date: string; deposits: number; withdrawals: number; closing: number }[];
};

export default function TreasuryPage() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/treasury')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-28 mb-2" /><Skeleton className="h-4 w-44" /></div>
        <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-20" /></div>)}
        </div>
      </div>
    );
  }

  const { snapshot: snap, history } = data;
  const reservePercent = snap.userLiabilities > 0
    ? Math.round(((snap.totalBalance - snap.userLiabilities) / snap.totalBalance) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Treasury</h1>
          <p className="text-sm text-textDark">Real-time financial overview</p>
        </div>
        <Badge variant={reservePercent > 30 ? 'success' : reservePercent > 20 ? 'warning' : 'danger'}>
          {reservePercent > 30 ? 'Healthy' : reservePercent > 20 ? 'Caution' : 'Critical'}
        </Badge>
      </div>

      <Card className="border-blue/30">
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Total Treasury Balance</p>
              <p className="text-4xl font-bold text-white mb-4">${(snap.totalBalance / 100).toFixed(2)}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-textDark uppercase">User Liabilities</p>
                  <p className="text-lg font-semibold text-orange">${(snap.userLiabilities / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Available Reserve</p>
                  <p className="text-lg font-semibold text-green">{reservePercent}%</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Pending Withdrawals</p>
                  <p className="text-lg font-semibold text-red">{snap.pendingWithdrawals} (${(snap.pendingWithdrawalAmount / 100).toFixed(2)})</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#31394c" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={reservePercent > 30 ? '#00c365' : reservePercent > 20 ? '#ff8c00' : '#ff4954'} strokeWidth="8" strokeDasharray={`${reservePercent * 2.51} 251`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-white">{reservePercent}%</p>
                  <p className="text-[10px] text-textDark">Reserve</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today's Deposits" value={`$${(snap.todayDeposits / 100).toFixed(2)}`} />
        <StatsCard title="Today's Withdrawals" value={`$${(snap.todayWithdrawals / 100).toFixed(2)}`} />
        <StatsCard title="Pending Withdrawals" value={snap.pendingWithdrawals} />
        <StatsCard title="Reserve %" value={`${reservePercent}%`} />
      </div>

      {history.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Treasury Balance (7 Days)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="treasuryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007aff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                    <XAxis dataKey="date" stroke="#525a6b" fontSize={10} />
                    <YAxis stroke="#525a6b" fontSize={10} tickFormatter={(v) => `$${(v / 10000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => [`$${(Number(v) / 100).toFixed(2)}`, 'Balance']} />
                    <Area type="monotone" dataKey="closing" stroke="#007aff" fillOpacity={1} fill="url(#treasuryGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Deposits vs Withdrawals (7 Days)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                    <XAxis dataKey="date" stroke="#525a6b" fontSize={10} />
                    <YAxis stroke="#525a6b" fontSize={10} tickFormatter={(v) => `$${(v / 10000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => [`$${(Number(v) / 100).toFixed(2)}`]} />
                    <Bar dataKey="deposits" fill="#007aff" radius={[4, 4, 0, 0]} name="Deposits" />
                    <Bar dataKey="withdrawals" fill="#ff4954" radius={[4, 4, 0, 0]} name="Withdrawals" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
