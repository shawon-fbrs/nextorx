'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Badge } from '@/components/admin/ui/badge';
import { Progress } from '@/components/admin/ui/progress';
import { Alert } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import { treasurySnapshot, treasuryHistory } from '@/lib/mock-data/treasury';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function TreasuryPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-28 mb-2" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-6 w-28" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <Skeleton className="h-40 w-40 rounded-full" />
                <div className="flex gap-4 mt-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-12" />)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
              <CardContent><Skeleton className="h-64 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-44" /></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snap = treasurySnapshot;
  const history = treasuryHistory;

  const statusColor = {
    healthy: 'success',
    caution: 'warning',
    warning: 'danger',
    critical: 'danger',
  } as const;

  const last7 = history.slice(-7);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Treasury</h1>
          <p className="text-sm text-textDark">Real-time financial overview</p>
        </div>
        <Badge variant={statusColor[snap.status]} className="text-sm px-3 py-1">
          {snap.status === 'healthy' ? '🟢 Healthy' : snap.status === 'caution' ? '🟡 Caution' : '🔴 Critical'}
        </Badge>
      </div>

      {/* Critical Alerts */}
      {snap.reservePercent < 20 && (
        <Alert variant="danger" title="Low Reserve Warning">
          Treasury reserve at {snap.reservePercent}% — below 20% threshold. Withdrawals may be limited.
        </Alert>
      )}
      {snap.dailyWithdrawals > snap.dailyDeposits && (
        <Alert variant="warning" title="Net Outflow Day">
          Withdrawals (${snap.dailyWithdrawals.toLocaleString()}) exceed deposits (${snap.dailyDeposits.toLocaleString()}) today.
        </Alert>
      )}

      {/* Main Treasury Card */}
      <Card className="border-blue/30">
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Balance */}
            <div className="lg:col-span-2">
              <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Total Treasury Balance</p>
              <p className="text-4xl font-bold text-white mb-4">${snap.totalBalance.toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-textDark uppercase">User Liabilities</p>
                  <p className="text-lg font-semibold text-orange">${snap.userLiabilities.toLocaleString()}</p>
                  <p className="text-[10px] text-textDark">{((snap.userLiabilities / snap.totalBalance) * 100).toFixed(1)}% of treasury</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Available Reserve</p>
                  <p className="text-lg font-semibold text-green">${snap.availableReserve.toLocaleString()}</p>
                  <p className="text-[10px] text-textDark">{snap.reservePercent}% reserve ratio</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Pending Withdrawals</p>
                  <p className="text-lg font-semibold text-red">${snap.pendingWithdrawals.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Net Available</p>
                  <p className="text-lg font-semibold text-white">${snap.netAvailable.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Reserve Gauge */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[11px] text-textDark uppercase tracking-wider mb-3">Reserve Health</p>
              <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#31394c" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={snap.reservePercent > 30 ? '#00c365' : snap.reservePercent > 20 ? '#ff8c00' : '#ff4954'}
                    strokeWidth="8"
                    strokeDasharray={`${snap.reservePercent * 2.51} 251`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-white">{snap.reservePercent}%</p>
                  <p className="text-[10px] text-textDark">Reserve</p>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-[10px]">
                <span className="text-green">Healthy: {'>'}30%</span>
                <span className="text-orange">Caution: 20-30%</span>
                <span className="text-red">Critical: {'<'}20%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today's Deposits" value={`$${snap.dailyDeposits.toLocaleString()}`} />
        <StatsCard title="Today's Withdrawals" value={`$${snap.dailyWithdrawals.toLocaleString()}`} />
        <StatsCard title="Today's Volume" value={`$${snap.dailyVolume.toLocaleString()}`} />
        <StatsCard title="Today's Revenue" value={`$${snap.dailyRevenue.toLocaleString()}`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Treasury Balance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Treasury Balance (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7}>
                  <defs>
                    <linearGradient id="treasuryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007aff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                  <XAxis dataKey="date" stroke="#525a6b" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#525a6b" fontSize={10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Balance']} />
                  <Area type="monotone" dataKey="closing" stroke="#007aff" fillOpacity={1} fill="url(#treasuryGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                  <XAxis dataKey="date" stroke="#525a6b" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#525a6b" fontSize={10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#00c365" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deposit vs Withdrawal */}
        <Card>
          <CardHeader>
            <CardTitle>Deposits vs Withdrawals (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                  <XAxis dataKey="date" stroke="#525a6b" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#525a6b" fontSize={10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => [`$${Number(v).toLocaleString()}`]} />
                  <Bar dataKey="deposits" fill="#007aff" radius={[4, 4, 0, 0]} name="Deposits" />
                  <Bar dataKey="withdrawals" fill="#ff4954" radius={[4, 4, 0, 0]} name="Withdrawals" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reserve Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Reserve % Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                  <XAxis dataKey="date" stroke="#525a6b" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#525a6b" fontSize={10} tickFormatter={(v) => `${v}%`} domain={[0, 60]} />
                  <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => [`${Number(v)}%`, 'Reserve']} />
                  <Line type="monotone" dataKey="reservePercent" stroke="#ff8c00" strokeWidth={2} dot={{ fill: '#ff8c00' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Treasury Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-textDark uppercase">Date</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Opening</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Deposits</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Withdrawals</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Revenue</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Closing</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Reserve</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-textDark uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {last7.map((day) => (
                  <tr key={day.date} className="border-b border-border/50 hover:bg-surface-hover/50">
                    <td className="px-3 py-2 text-sm text-white">{day.date.slice(5)}</td>
                    <td className="px-3 py-2 text-sm text-text text-right">${day.opening.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-green text-right">+${day.deposits.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-red text-right">-${day.withdrawals.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-green text-right">+${day.revenue.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm font-medium text-white text-right">${day.closing.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-right">
                      <span className={day.reservePercent > 30 ? 'text-green' : day.reservePercent > 20 ? 'text-orange' : 'text-red'}>
                        {day.reservePercent}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={statusColor[day.status]}>{day.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
